// Word-style multiple selection: hold Ctrl (Cmd on Mac), select text, then hold
// Ctrl and select more text elsewhere. Every region stays selected, and
// formatting, the Bijoy / digits tools, Delete / Backspace, typing and paste act
// on all of them. Built as a ProseMirror selection with several ranges (the same
// idea prosemirror-tables uses for a block of cells).
import { Extension } from '@tiptap/core';
import { Fragment, Slice, type Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, Selection, SelectionRange, TextSelection, type Transaction } from '@tiptap/pm/state';
import type { Mappable } from '@tiptap/pm/transform';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

type Span = { from: number; to: number };

export class MultiRangeSelection extends Selection {
  spans: Span[];

  constructor(doc: PMNode, spans: Span[]) {
    const ranges = spans.map((s) => new SelectionRange(doc.resolve(s.from), doc.resolve(s.to)));
    super(ranges[0].$from, ranges[ranges.length - 1].$to, ranges);
    this.spans = spans;
  }

  map(doc: PMNode, mapping: Mappable): Selection {
    const spans = this.spans
      .map((s) => ({ from: mapping.map(s.from, 1), to: mapping.map(s.to, -1) }))
      .filter((s) => s.from < s.to);
    if (spans.length >= 2) return new MultiRangeSelection(doc, spans);
    if (spans.length === 1) return TextSelection.create(doc, spans[0].from, spans[0].to);
    return Selection.near(doc.resolve(mapping.map(this.from)));
  }

  eq(other: Selection): boolean {
    return other instanceof MultiRangeSelection
      && other.spans.length === this.spans.length
      && other.spans.every((s, i) => s.from === this.spans[i].from && s.to === this.spans[i].to);
  }

  // Replacing (Delete, typing, paste) removes every range and puts the new
  // content in the first one.
  replace(tr: Transaction, content: Slice = Slice.empty): void {
    for (let i = this.spans.length - 1; i >= 0; i--) {
      const from = tr.mapping.map(this.spans[i].from);
      const to = tr.mapping.map(this.spans[i].to);
      if (i === 0) tr.replace(from, to, content);
      else tr.delete(from, to);
    }
    const start = tr.mapping.map(this.spans[0].from);
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(start, tr.doc.content.size))));
  }

  toJSON() { return { type: 'multiRange', spans: this.spans }; }
  static fromJSON(doc: PMNode, json: { spans: Span[] }) { return new MultiRangeSelection(doc, json.spans); }
}
// The native selection is hidden (it would highlight everything in between);
// the ranges are drawn by decorations instead. (`visible` is a getter on the base
// class's prototype, so it is overridden the same way.)
Object.defineProperty(MultiRangeSelection.prototype, 'visible', { get: () => false });
Selection.jsonID('multiRange', MultiRangeSelection);

const key = new PluginKey<{ pending: Span[] }>('multiTextSelect');

// Sort, drop empties and merge overlapping / touching spans.
const normalise = (spans: Span[]): Span[] => {
  const sorted = spans.filter((s) => s.from < s.to).sort((a, b) => a.from - b.from);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.from <= last.to) last.to = Math.max(last.to, s.to);
    else out.push({ ...s });
  }
  return out;
};

const spansOf = (sel: Selection): Span[] => {
  if (sel instanceof MultiRangeSelection) return sel.spans;
  if (sel instanceof TextSelection && !sel.empty) return [{ from: sel.from, to: sel.to }];
  return [];
};

export const MultiTextSelect = Extension.create({
  name: 'multiTextSelect',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => ({ pending: [] as Span[] }),
          apply(tr, value) {
            const meta = tr.getMeta(key);
            if (meta) return { pending: meta.pending as Span[] };
            return value.pending.length && tr.docChanged
              ? { pending: value.pending.map((s) => ({ from: tr.mapping.map(s.from, 1), to: tr.mapping.map(s.to, -1) })) }
              : value;
          },
        },
        props: {
          // Highlight the chosen regions: the committed ranges, plus the ones
          // held while the next region is still being dragged out.
          decorations(state) {
            const spans = [...(state.selection instanceof MultiRangeSelection ? state.selection.spans : []), ...(key.getState(state)?.pending || [])];
            if (!spans.length) return null;
            return DecorationSet.create(
              state.doc,
              spans.filter((s) => s.from < s.to && s.to <= state.doc.content.size)
                .map((s) => Decoration.inline(s.from, s.to, { class: 'multi-select-range' }))
            );
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const e = event as MouseEvent;
              if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return false;
              const held = spansOf(view.state.selection);
              if (!held.length) return false;
              view.dispatch(view.state.tr.setMeta(key, { pending: held }));
              const finish = () => {
                window.removeEventListener('mouseup', finish, true);
                // Let ProseMirror read the browser's new selection first.
                setTimeout(() => {
                  const st = key.getState(view.state);
                  if (!st || !st.pending.length) return;
                  const merged = normalise([...st.pending, ...spansOf(view.state.selection)]);
                  let tr = view.state.tr.setMeta(key, { pending: [] });
                  if (merged.length >= 2) tr = tr.setSelection(new MultiRangeSelection(tr.doc, merged));
                  else if (merged.length === 1) tr = tr.setSelection(TextSelection.create(tr.doc, merged[0].from, merged[0].to));
                  view.dispatch(tr);
                }, 0);
              };
              window.addEventListener('mouseup', finish, true);
              return false;
            },
            copy(view, event) {
              const sel = view.state.selection;
              if (!(sel instanceof MultiRangeSelection)) return false;
              const text = sel.spans.map((s) => view.state.doc.textBetween(s.from, s.to, '\n')).join('\n');
              (event as ClipboardEvent).clipboardData?.setData('text/plain', text);
              event.preventDefault();
              return true;
            },
            cut(view, event) {
              const sel = view.state.selection;
              if (!(sel instanceof MultiRangeSelection)) return false;
              const text = sel.spans.map((s) => view.state.doc.textBetween(s.from, s.to, '\n')).join('\n');
              (event as ClipboardEvent).clipboardData?.setData('text/plain', text);
              event.preventDefault();
              view.dispatch(view.state.tr.deleteSelection());
              return true;
            },
            // Dragging a multi selection would move everything in between.
            dragstart(view, event) {
              if (view.state.selection instanceof MultiRangeSelection) { event.preventDefault(); return true; }
              return false;
            },
          },
          // Typing replaces the first region and removes the rest (the default
          // would replace the whole stretch between the first and last).
          handleTextInput(view, _from, _to, text) {
            const sel = view.state.selection;
            if (!(sel instanceof MultiRangeSelection)) return false;
            const tr = view.state.tr;
            sel.replace(tr, new Slice(Fragment.from(view.state.schema.text(text)), 0, 0));
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
