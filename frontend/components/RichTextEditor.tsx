"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo,
  Table as TableIcon, LayoutTemplate, Trash2, Columns, Rows, Settings, Languages
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CustomSelect from './CustomSelect';
import { isBijoyText, convertBijoyToUnicode, convertHtmlBijoyToUnicode } from '../lib/bijoyToUnicode';
import { toast } from 'sonner';

const MenuBar = ({ editor }: { editor: any }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'table' | 'tools'>('home');

  if (!editor) return null;

  const isTableActive = editor.isActive('table');

  const getHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'p';
  };

  const handleHeadingChange = (val: string) => {
    if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
    else editor.chain().focus().setParagraph().run();
  };

  return (
    <div className="bg-card border-b border-border flex flex-col sticky top-0 z-10 w-full shadow-sm select-none">
      {/* RIBBON TAB HEADER BAR */}
      <div className="flex items-center gap-1 bg-muted/70 px-3 pt-1.5 border-b border-border/60 text-xs font-semibold text-muted-foreground overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`px-3 py-1.5 rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'home'
              ? 'bg-card text-primary font-bold border-t-2 border-primary border-x border-border shadow-xs'
              : 'hover:text-foreground hover:bg-card/50'
          }`}
        >
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('insert')}
          className={`px-3 py-1.5 rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'insert'
              ? 'bg-card text-primary font-bold border-t-2 border-primary border-x border-border shadow-xs'
              : 'hover:text-foreground hover:bg-card/50'
          }`}
        >
          <span>Insert</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('table')}
          className={`px-3 py-1.5 rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer relative ${
            activeTab === 'table'
              ? 'bg-card text-primary font-bold border-t-2 border-primary border-x border-border shadow-xs'
              : 'hover:text-foreground hover:bg-card/50'
          }`}
        >
          <span>Table Tools</span>
          {isTableActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Cursor inside table" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tools')}
          className={`px-3 py-1.5 rounded-t-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'tools'
              ? 'bg-card text-primary font-bold border-t-2 border-primary border-x border-border shadow-xs'
              : 'hover:text-foreground hover:bg-card/50'
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-primary" />
          <span>Bijoy & Tools</span>
        </button>
      </div>

      {/* RIBBON BODY / TOOLBAR CONTENT */}
      <div className="p-2 bg-card min-h-[50px] flex items-center overflow-x-auto">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            {/* Font & Style */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-border/60">
              <div className="w-36">
                <CustomSelect
                  value={editor.getAttributes('textStyle').fontFamily || ''}
                  onChange={(val) => editor.chain().focus().setFontFamily(val).run()}
                  options={[
                    { value: "", label: "Default Font" },
                    { value: "Inter", label: "English (Inter)" },
                    { value: "Noto Sans Bengali, sans-serif", label: "Bangla (Noto)" }
                  ]}
                />
              </div>

              <div className="w-32">
                <CustomSelect
                  value={getHeadingValue()}
                  onChange={handleHeadingChange}
                  options={[
                    { value: "p", label: "Normal Text" },
                    { value: "h1", label: "Heading 1" },
                    { value: "h2", label: "Heading 2" },
                    { value: "h3", label: "Heading 3" }
                  ]}
                />
              </div>
            </div>

            {/* Basic Formatting */}
            <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('bold') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('italic') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('underline') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('strike') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                title="Clear Formatting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
              <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Justify Text"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>

            {/* Lists & Quotes */}
            <div className="flex items-center gap-0.5 px-2 border-r border-border/60">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('bulletList') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('orderedList') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded hover:bg-muted ${editor.isActive('blockquote') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                title="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
            </div>

            {/* History */}
            <div className="flex items-center gap-0.5 pl-2">
              <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: INSERT */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-2 text-xs font-semibold border border-border"
            >
              <TableIcon className="w-4 h-4 text-primary" />
              <span>Insert Table (3x3)</span>
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 4, withHeaderRow: true }).run()}
              className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-2 text-xs font-semibold border border-border"
            >
              <TableIcon className="w-4 h-4 text-primary" />
              <span>Insert Table (2x4)</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold border border-border"
            >
              <span>— Horizontal Line</span>
            </button>
          </div>
        )}

        {/* TAB 3: TABLE TOOLS */}
        {activeTab === 'table' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {!isTableActive ? (
              <div className="text-xs text-muted-foreground italic flex items-center gap-2 py-1">
                <span>Place your cursor inside a table in the editor to activate table editing tools.</span>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded text-xs not-italic"
                >
                  Insert Table Now
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold uppercase text-primary tracking-wider mr-2">Table Actions:</span>
                
                <div className="flex items-center gap-1 pr-2 border-r border-border/60">
                  <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1">
                    <Columns className="w-3.5 h-3.5 text-primary" /> +Left
                  </button>
                  <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1">
                    <Columns className="w-3.5 h-3.5 text-primary" /> +Right
                  </button>
                  <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 rounded hover:bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Del Col
                  </button>
                </div>

                <div className="flex items-center gap-1 px-2 border-r border-border/60">
                  <button onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1">
                    <Rows className="w-3.5 h-3.5 text-primary" /> +Above
                  </button>
                  <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1">
                    <Rows className="w-3.5 h-3.5 text-primary" /> +Below
                  </button>
                  <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 rounded hover:bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Del Row
                  </button>
                </div>

                <div className="flex items-center gap-1 pl-2">
                  <button onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1">
                    <Settings className="w-3.5 h-3.5 text-primary" /> Toggle Header
                  </button>
                  <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1 hover:bg-destructive/20">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Table
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: BIJOY & TOOLS */}
        {activeTab === 'tools' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const { from, to, empty } = editor.state.selection;
                if (!empty) {
                  const selectedText = editor.state.doc.textBetween(from, to, ' ');
                  if (selectedText) {
                    const converted = convertBijoyToUnicode(selectedText);
                    editor.chain().focus().insertContentAt({ from, to }, converted).run();
                    toast.success("Selected text converted from Bijoy to Unicode Bangla");
                  }
                } else {
                  const htmlContent = editor.getHTML();
                  const convertedHtml = convertHtmlBijoyToUnicode(htmlContent);
                  editor.commands.setContent(convertedHtml, { emitUpdate: true });
                  toast.success("Editor content converted from Bijoy to Unicode Bangla");
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-2 text-xs font-bold border border-primary/30 hover:bg-primary/20 transition-all shadow-xs cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span>Convert Bijoy (SutonnyMJ) ➔ Unicode Bangla</span>
            </button>
            <span className="text-xs text-muted-foreground">
              Converts selected Bijoy text or all editor text automatically into standard Bangla Unicode.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RichTextEditor({ 
  content, 
  onChange,
  className = "p-4 min-h-[150px]",
  editable = true
}: { 
  content: string; 
  onChange: (html: string) => void;
  className?: string;
  editable?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none h-full ${className}`,
      },
      handlePaste: (view, event) => {
        const pastedText = event.clipboardData?.getData('text/plain');
        if (pastedText && isBijoyText(pastedText)) {
          const converted = convertBijoyToUnicode(pastedText);
          view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(converted)));
          toast.info("Bijoy text auto-converted to Unicode Bangla");
          return true;
        }
        return false;
      },
    },
  });

  // Sync content from props into the editor when it changes externally (e.g. prefill)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content]);

  return (
    <div className={`flex flex-col w-full h-full bg-background overflow-hidden ${!editable ? 'opacity-70 cursor-not-allowed' : ''}`}>
      {editable && <MenuBar editor={editor} />}
      <div className={`flex-1 overflow-y-auto ${!editable ? 'pointer-events-none' : ''}`}>
        <EditorContent editor={editor} className="h-full cursor-text" />
      </div>
    </div>
  );
}
