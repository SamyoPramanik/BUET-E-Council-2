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
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import { Extension } from '@tiptap/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo,
  Table as TableIcon, Trash2, Columns, Rows, Settings, Languages,
  Omega, Search, X, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Palette, Highlighter, Link as LinkIcon, Unlink, Sliders as LineHeightIcon,
  Indent as IndentIcon, Outdent as OutdentIcon, CaseSensitive, FileText,
  ZoomIn, ZoomOut, RotateCw, Eye, SplitSquareVertical, AlertCircle, Info,
  CheckSquare, ArrowLeftRight, Check, Maximize2, Minimize2, Sparkles, Sliders,
  Scissors, Copy, Clipboard, Paintbrush, ArrowDownAZ, Pilcrow, PaintBucket,
  ChevronDown, Grid, Sparkle, Layout, Ruler, Sigma, Keyboard, HelpCircle
} from 'lucide-react';
import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';
import { isBijoyText, convertBijoyToUnicode, convertHtmlBijoyToUnicode } from '../lib/bijoyToUnicode';
import { toast } from 'sonner';

// Custom TipTap Extension for Font Size
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom TipTap Extension for Line Height / Line Spacing
export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ chain }: any) => {
        return chain().updateAttributes('paragraph', { lineHeight }).updateAttributes('heading', { lineHeight }).run();
      },
      unsetLineHeight: () => ({ chain }: any) => {
        return chain().updateAttributes('paragraph', { lineHeight: null }).updateAttributes('heading', { lineHeight: null }).run();
      },
    };
  },
});

// Custom Paragraph Shading (Background Color) Extension
export const ParagraphShading = Extension.create({
  name: 'paragraphShading',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          shading: {
            default: null,
            parseHTML: element => element.style.backgroundColor || null,
            renderHTML: attributes => {
              if (!attributes.shading) return {};
              return { style: `background-color: ${attributes.shading}; padding: 4px 8px; border-radius: 4px;` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphShading: (color: string) => ({ chain }: any) => {
        return chain().updateAttributes('paragraph', { shading: color }).updateAttributes('heading', { shading: color }).run();
      },
      unsetParagraphShading: () => ({ chain }: any) => {
        return chain().updateAttributes('paragraph', { shading: null }).updateAttributes('heading', { shading: null }).run();
      },
    };
  },
});

// Custom Indent Extension
export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem'],
      minLevel: 0,
      maxLevel: 8,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              const marginLeft = element.style.marginLeft;
              if (!marginLeft) return 0;
              return Math.round(parseInt(marginLeft, 10) / 24) || 0;
            },
            renderHTML: attributes => {
              if (!attributes.indent || attributes.indent <= 0) return {};
              return { style: `margin-left: ${attributes.indent * 24}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        const { $from, $to } = selection;
        tr.doc.nodesBetween($from.pos, $to.pos, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0;
            if (currentIndent < this.options.maxLevel) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent + 1 });
            }
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      outdent: () => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        const { $from, $to } = selection;
        tr.doc.nodesBetween($from.pos, $to.pos, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0;
            if (currentIndent > this.options.minLevel) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent - 1 });
            }
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        if (this.editor.isActive('table')) {
          return false;
        }
        return this.editor.commands.indent();
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) {
          return false;
        }
        return this.editor.commands.outdent();
      },
    };
  },
});

// Custom TableCell with Text Orientation / Rotation Attribute
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-text-direction': {
        default: 'horizontal',
        parseHTML: element => element.getAttribute('data-text-direction') || 'horizontal',
        renderHTML: attributes => {
          const dir = attributes['data-text-direction'] || 'horizontal';
          if (dir === 'vertical-rl') {
            return {
              'data-text-direction': 'vertical-rl',
              style: 'writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; vertical-align: middle;',
            };
          }
          return { 'data-text-direction': 'horizontal' };
        },
      },
    };
  },
});

// Custom Table with Tab Keyboard Shortcut & Border options
export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-border': {
        default: 'full',
        parseHTML: element => element.getAttribute('data-border') || 'full',
        renderHTML: attributes => {
          const borderStyle = attributes['data-border'] || 'full';
          return {
            'data-border': borderStyle,
            class: `meeting-table border-${borderStyle}`,
          };
        },
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: ({ editor }) => {
        if (editor.isActive('table')) {
          const { selection } = editor.state;
          const pos = selection.$from;
          let tableCellNode = null;
          let tableNode = null;
          for (let d = pos.depth; d > 0; d--) {
            const node = pos.node(d);
            if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
              tableCellNode = node;
            }
            if (node.type.name === 'table') {
              tableNode = node;
              break;
            }
          }
          if (tableNode && tableCellNode) {
            const lastRow = tableNode.lastChild;
            const lastCell = lastRow ? lastRow.lastChild : null;
            if (lastCell && pos.pos >= pos.after() - 3) {
              return editor.chain().addRowAfter().goToNextCell().run();
            }
          }
          return editor.chain().goToNextCell().run();
        }
        return false;
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
    paragraphShading: {
      setParagraphShading: (color: string) => ReturnType;
      unsetParagraphShading: () => ReturnType;
    };
  }
}

const FONT_SIZE_STEPS = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'];

const SYMBOL_CATEGORIES = [
  {
    name: "Bangla & Administrative",
    symbols: ["৳", "।", "॥", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯", "০", "ক", "খ", "গ", "ঘ", "নথি নং:", "স্মারক নং:", "তারিখ:", "সংযুক্তি:", "স্বাক্ষর:", "অনুলিপি:"]
  },
  {
    name: "Currency & Legal",
    symbols: ["৳", "$", "€", "£", "¥", "₹", "§", "¶", "†", "‡", "©", "®", "™", "№", "℅", "℀", "※", "⁂", "❡", "⁑"]
  },
  {
    name: "Math & Science",
    symbols: ["±", "×", "÷", "≠", "≈", "≤", "≥", "√", "∛", "∜", "∞", "µ", "π", "Ω", "∑", "∏", "∆", "∇", "∂", "∫", "∬", "∮", "≡", "≢", "≅", "∝", "∈", "∉", "⊂", "⊃", "⊆", "⊇", "∪", "∩", "∅", "⊥", "∠", "∟", "%", "‰", "‱", "°", "′", "″", "Å"]
  },
  {
    name: "Greek Lowercase",
    symbols: ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"]
  },
  {
    name: "Greek Uppercase",
    symbols: ["Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω"]
  },
  {
    name: "Punctuation & Quotes",
    symbols: ["‘", "’", "“", "”", "«", "»", "‹", "›", "–", "—", "…", "•", "·", "°", "⟨", "⟩", "⌈", "⌉", "⌊", "⌋"]
  },
  {
    name: "Fractions & Scripts",
    symbols: ["½", "⅓", "⅔", "¼", "¾", "⅕", "⅖", "⅗", "⅘", "⅙", "⅚", "⅛", "⅜", "⅝", "⅞", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁰", "ⁿ", "₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"]
  },
  {
    name: "Arrows & Flow",
    symbols: ["←", "→", "↑", "↓", "↔", "↕", "↖", "↗", "↘", "↙", "⇒", "⇔", "➔", "►", "▼", "◄", "▲", "↵", "↛", "⇄", "⇅"]
  },
  {
    name: "Bullets & Checkmarks",
    symbols: ["✓", "✔", "✕", "✖", "✗", "✘", "☑", "☒", "☐", "★", "☆", "■", "□", "▪", "▫", "▲", "Δ", "○", "●", "◆", "◇", "♦", "◊"]
  }
];

const EQUATION_PRESETS = [
  {
    name: "Quadratic Formula",
    category: "Algebra",
    formula: "x = (-b ± √(b² - 4ac)) / 2a",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">x = <sup>-b ± &radic;(b<sup>2</sup> - 4ac)</sup>&frasl;<sub>2a</sub></span>`
  },
  {
    name: "Area of a Circle",
    category: "Geometry",
    formula: "A = πr²",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">A = &pi;r<sup>2</sup></span>`
  },
  {
    name: "Pythagorean Theorem",
    category: "Geometry",
    formula: "a² + b² = c²",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">a<sup>2</sup> + b<sup>2</sup> = c<sup>2</sup></span>`
  },
  {
    name: "Binomial Theorem",
    category: "Algebra",
    formula: "(x + a)ⁿ = ∑ₖ (ⁿₖ) xⁿ⁻ᵏ aᵏ",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">(x + a)<sup>n</sup> = &sum;<sub>k=0</sub><sup>n</sup> (<sup>n</sup><sub>k</sub>) x<sup>n-k</sup>a<sup>k</sup></span>`
  },
  {
    name: "Mass-Energy Equivalence",
    category: "Physics",
    formula: "E = mc²",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">E = mc<sup>2</sup></span>`
  },
  {
    name: "Definite Integral",
    category: "Calculus",
    formula: "∫ₐᵇ f(x) dx",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">&int;<sub>a</sub><sup>b</sup> f(x) dx</span>`
  },
  {
    name: "Summation Series",
    category: "Calculus",
    formula: "∑ᵢ₌₁ⁿ xᵢ",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">&sum;<sub>i=1</sub><sup>n</sup> x<sub>i</sub></span>`
  },
  {
    name: "Fraction Preset",
    category: "Basic Math",
    formula: "a / b",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block"><sup>a</sup>&frasl;<sub>b</sub></span>`
  },
  {
    name: "Square Root / Radical",
    category: "Basic Math",
    formula: "√(x² + y²)",
    html: `<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">&radic;(x<sup>2</sup> + y<sup>2</sup>)</span>`
  },
  {
    name: "Bangla Triangle Area",
    category: "বাংলা গণিত",
    formula: "ক্ষেত্রফল = (১/২) × ভূমি × উচ্চতা",
    html: `<span class="math-equation bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">ক্ষেত্রফল = &frac12; &times; ভূমি &times; উচ্চতা</span>`
  },
  {
    name: "Bangla Circle Perimeter",
    category: "বাংলা গণিত",
    formula: "পরিধি = ২πr",
    html: `<span class="math-equation bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">পরিধি = ২&pi;r</span>`
  }
];

const KEYBOARD_SHORTCUTS_DATA = [
  {
    category: "Indentation & Paragraphs",
    shortcuts: [
      { key: "Tab", desc: "Increase Paragraph / List Indent (Shift Right)" },
      { key: "Shift + Tab", desc: "Decrease Paragraph / List Indent (Shift Left)" },
      { key: "Ctrl + L", desc: "Align Text Left" },
      { key: "Ctrl + E", desc: "Align Text Center" },
      { key: "Ctrl + R", desc: "Align Text Right" },
      { key: "Ctrl + J", desc: "Justify Paragraph Alignment" }
    ]
  },
  {
    category: "Text Formatting & Styles",
    shortcuts: [
      { key: "Ctrl + B", desc: "Toggle Bold Styling" },
      { key: "Ctrl + I", desc: "Toggle Italic Styling" },
      { key: "Ctrl + U", desc: "Toggle Underline Styling" },
      { key: "Ctrl + Shift + X", desc: "Toggle Strikethrough Text" },
      { key: "Ctrl + Shift + +", desc: "Toggle Superscript (x²)" },
      { key: "Ctrl + +", desc: "Toggle Subscript (x₂)" }
    ]
  },
  {
    category: "Clipboard & Editing",
    shortcuts: [
      { key: "Ctrl + C", desc: "Copy Selected Text / Content" },
      { key: "Ctrl + X", desc: "Cut Selected Text" },
      { key: "Ctrl + V", desc: "Paste (Auto-converts Bijoy text to Unicode)" },
      { key: "Ctrl + Z", desc: "Undo Last Action" },
      { key: "Ctrl + Y", desc: "Redo Last Action" },
      { key: "Ctrl + F", desc: "Open Find & Replace Tool" },
      { key: "Ctrl + K", desc: "Insert / Edit Hyperlink" }
    ]
  },
  {
    category: "View & Navigation",
    shortcuts: [
      { key: "Ctrl + /", desc: "Open Keyboard Shortcuts Guide" },
      { key: "Esc", desc: "Exit Fullscreen Mode or Close Open Modals" }
    ]
  }
];

const PRESET_TEXT_COLORS = [
  { label: 'Default', color: '' },
  { label: 'Black', color: '#000000' },
  { label: 'Dark Gray', color: '#4b5563' },
  { label: 'BUET Crimson Red', color: '#800000' },
  { label: 'Primary Blue', color: '#2563eb' },
  { label: 'Emerald Green', color: '#059669' },
  { label: 'Amber Orange', color: '#d97706' },
  { label: 'Purple', color: '#7c3aed' },
];

const PRESET_HIGHLIGHT_COLORS = [
  { label: 'None', color: '' },
  { label: 'Yellow Highlight', color: '#fef08a' },
  { label: 'Green Highlight', color: '#bbf7d0' },
  { label: 'Cyan Highlight', color: '#a5f3fc' },
  { label: 'Pink Highlight', color: '#fbcfe8' },
  { label: 'Orange Highlight', color: '#fed7aa' },
];

const PRESET_SHADING_COLORS = [
  { label: 'No Shading', color: '' },
  { label: 'Light Blue Shading', color: '#e0f2fe' },
  { label: 'Light Yellow Shading', color: '#fef9c3' },
  { label: 'Light Green Shading', color: '#dcfce7' },
  { label: 'Light Rose Shading', color: '#ffe4e6' },
  { label: 'Light Gray Shading', color: '#f3f4f6' },
  { label: 'BUET Crimson Tint', color: '#fdf2f2' }
];

const WORD_QUICK_STYLES = [
  { 
    id: 'normal', 
    name: 'Normal', 
    preview: 'AaBbCc', 
    desc: 'Default Text', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().unsetFontSize().unsetBold().unsetItalic().unsetColor().run();
      } else {
        e.chain().focus().setParagraph().unsetFontSize().unsetBold().unsetItalic().run();
      }
    } 
  },
  { 
    id: 'no_spacing', 
    name: 'No Spacing', 
    preview: 'AaBbCc', 
    desc: 'Compact Lines', 
    action: (e: any) => e.chain().focus().setLineHeight('1.0').run() 
  },
  { 
    id: 'heading1', 
    name: 'Heading 1', 
    preview: 'Heading 1', 
    desc: 'Title 26px Bold', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().setFontSize('26px').setBold().run();
      } else {
        e.chain().focus().unsetFontSize().toggleHeading({ level: 1 }).run();
      }
    } 
  },
  { 
    id: 'heading2', 
    name: 'Heading 2', 
    preview: 'Heading 2', 
    desc: 'Section 20px Bold', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().setFontSize('20px').setBold().run();
      } else {
        e.chain().focus().unsetFontSize().toggleHeading({ level: 2 }).run();
      }
    } 
  },
  { 
    id: 'heading3', 
    name: 'Heading 3', 
    preview: 'Heading 3', 
    desc: 'Subsection 17px', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().setFontSize('17px').setBold().run();
      } else {
        e.chain().focus().unsetFontSize().toggleHeading({ level: 3 }).run();
      }
    } 
  },
  { 
    id: 'title', 
    name: 'Title', 
    preview: 'TITLE', 
    desc: 'Main Doc Title', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().setFontSize('32px').setBold().run();
      } else {
        e.chain().focus().setFontSize('32px').setBold().setTextAlign('center').run();
      }
    } 
  },
  { 
    id: 'subtitle', 
    name: 'Subtitle', 
    preview: 'Subtitle', 
    desc: 'Italic Subtitle', 
    action: (e: any) => {
      if (!e.state.selection.empty) {
        e.chain().focus().setFontSize('18px').setItalic().run();
      } else {
        e.chain().focus().setFontSize('18px').setItalic().setTextAlign('center').run();
      }
    } 
  },
  { id: 'subtle_emphasis', name: 'Subtle Emphasis', preview: 'Emphasis', desc: 'Italic Soft Text', action: (e: any) => e.chain().focus().setItalic().setColor('#6b5c58').run() },
  { id: 'intense_emphasis', name: 'Intense Emphasis', preview: 'Emphasis!', desc: 'Bold Crimson Accent', action: (e: any) => e.chain().focus().setBold().setItalic().setColor('#800000').run() },
  { id: 'quote', name: 'Quote', preview: '“ Quote ”', desc: 'Blockquote Style', action: (e: any) => e.chain().focus().toggleBlockquote().run() }
];

interface MenuBarProps {
  editor: any;
  viewMode: 'fluid' | 'pageView';
  setViewMode: (mode: 'fluid' | 'pageView') => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  onOpenFindReplace: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  showParagraphMarks: boolean;
  setShowParagraphMarks: (val: boolean) => void;
  showRuler: boolean;
  setShowRuler: (val: boolean) => void;
}

const MenuBar = ({ 
  editor, 
  viewMode, 
  setViewMode, 
  zoomLevel, 
  setZoomLevel, 
  onOpenFindReplace, 
  isFullscreen, 
  setIsFullscreen,
  showParagraphMarks,
  setShowParagraphMarks,
  showRuler,
  setShowRuler
}: MenuBarProps) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'table' | 'layout' | 'tools' | 'view'>('home');
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);
  const [tableBorderOption, setTableBorderOption] = useState<string>('full');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [equationSearch, setEquationSearch] = useState('');
  const [shortcutsSearch, setShortcutsSearch] = useState('');
  const [customEquationInput, setCustomEquationInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const [mounted, setMounted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showShadingPicker, setShowShadingPicker] = useState(false);
  const [formatPainterActive, setFormatPainterActive] = useState(false);
  const [storedFormat, setStoredFormat] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTableModalOpen) setIsTableModalOpen(false);
        if (isSymbolModalOpen) setIsSymbolModalOpen(false);
        if (isEquationModalOpen) setIsEquationModalOpen(false);
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        if (isLinkModalOpen) setIsLinkModalOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableModalOpen, isSymbolModalOpen, isEquationModalOpen, isShortcutsModalOpen, isLinkModalOpen]);

  if (!editor) return null;

  const isTableActive = editor.isActive('table');

  const getHeadingValue = () => {
    if (editor.isActive('heading', { level: 1 })) return 'h1';
    if (editor.isActive('heading', { level: 2 })) return 'h2';
    if (editor.isActive('heading', { level: 3 })) return 'h3';
    return 'p';
  };

  const handleHeadingChange = (val: string) => {
    const { empty } = editor.state.selection;
    if (!empty) {
      if (val === 'h1') editor.chain().focus().setFontSize('26px').setBold().run();
      else if (val === 'h2') editor.chain().focus().setFontSize('20px').setBold().run();
      else if (val === 'h3') editor.chain().focus().setFontSize('17px').setBold().run();
      else editor.chain().focus().unsetFontSize().unsetBold().run();
      toast.success("Applied style to highlighted selection");
      return;
    }

    if (val === 'h1') editor.chain().focus().unsetFontSize().toggleHeading({ level: 1 }).run();
    else if (val === 'h2') editor.chain().focus().unsetFontSize().toggleHeading({ level: 2 }).run();
    else if (val === 'h3') editor.chain().focus().unsetFontSize().toggleHeading({ level: 3 }).run();
    else editor.chain().focus().setParagraph().run();
  };

  // Grow Font Size Action
  const handleGrowFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize || '14px';
    const num = parseInt(currentSize, 10) || 14;
    const nextStep = FONT_SIZE_STEPS.find(s => parseInt(s, 10) > num) || `${num + 2}px`;
    editor.chain().focus().setFontSize(nextStep).run();
    toast.success(`Font size increased to ${nextStep}`);
  };

  // Shrink Font Size Action
  const handleShrinkFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize || '14px';
    const num = parseInt(currentSize, 10) || 14;
    const prevSteps = FONT_SIZE_STEPS.filter(s => parseInt(s, 10) < num);
    const prevStep = prevSteps.length > 0 ? prevSteps[prevSteps.length - 1] : '10px';
    editor.chain().focus().setFontSize(prevStep).run();
    toast.success(`Font size decreased to ${prevStep}`);
  };

  // Cut Action
  const handleCut = () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      toast.info("Select text first to cut");
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    navigator.clipboard.writeText(selectedText);
    editor.chain().focus().deleteSelection().run();
    toast.success("Cut text to clipboard");
  };

  // Copy Action
  const handleCopy = () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      toast.info("Select text first to copy");
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    navigator.clipboard.writeText(selectedText);
    toast.success("Copied text to clipboard");
  };

  // Paste Action
  const handlePasteAction = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
        toast.success("Pasted content from clipboard");
      }
    } catch {
      toast.info("Press Ctrl+V to paste content");
    }
  };

  // Format Painter Toggle
  const handleFormatPainter = () => {
    if (formatPainterActive) {
      setFormatPainterActive(false);
      setStoredFormat(null);
      toast.info("Format Painter deactivated");
    } else {
      const activeAttrs = {
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        strike: editor.isActive('strike'),
        fontSize: editor.getAttributes('textStyle').fontSize,
        fontFamily: editor.getAttributes('textStyle').fontFamily,
        color: editor.getAttributes('textStyle').color,
        highlight: editor.getAttributes('highlight').color,
      };
      setStoredFormat(activeAttrs);
      setFormatPainterActive(true);
      toast.success("Format Painter active: select text to apply formatting");
    }
  };

  // Sort Lines A-Z Action
  const handleSortLines = () => {
    const { from, to, empty } = editor.state.selection;
    let rawText = '';
    if (!empty) {
      rawText = editor.state.doc.textBetween(from, to, '\n');
    } else {
      rawText = editor.getText();
    }
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      toast.info("Select multiple lines to sort");
      return;
    }
    lines.sort((a, b) => a.localeCompare(b, 'bn-BD'));
    const sortedText = lines.join('\n');
    if (!empty) {
      editor.chain().focus().insertContentAt({ from, to }, sortedText).run();
    } else {
      editor.commands.setContent(sortedText, { emitUpdate: true });
    }
    toast.success(`Sorted ${lines.length} lines alphabetically (A-Z / ক-ক্ষ)`);
  };

  const handleTextCaseChange = (mode: 'upper' | 'lower' | 'title' | 'sentence' | 'bangla_title') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      toast.info("Select text first to change case or style");
      return;
    }
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text) return;

    if (mode === 'bangla_title') {
      editor.chain().focus().setFontSize('20px').setBold().toggleUnderline().run();
      toast.success("Applied Bangla Title Style");
      return;
    }

    let converted = text;
    if (mode === 'upper') converted = text.toUpperCase();
    else if (mode === 'lower') converted = text.toLowerCase();
    else if (mode === 'title') {
      converted = text.replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    } else if (mode === 'sentence') {
      converted = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    editor.chain().focus().insertContentAt({ from, to }, converted).run();
    toast.success(`Converted text case`);
  };

  const openLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setIsLinkModalOpen(true);
  };

  const applyLink = () => {
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      toast.info("Link removed");
    } else {
      const formattedUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('mailto:')
        ? linkUrl
        : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl, target: linkOpenNewTab ? '_blank' : '_self' }).run();
      toast.success("Hyperlink applied");
    }
    setIsLinkModalOpen(false);
  };

  return (
    <div className="bg-card border-b border-border flex flex-col sticky top-0 z-20 w-full shadow-xs select-none">
      {/* RIBBON TAB NAVIGATION BAR (AUTHENTIC WORD 2007 TABS) */}
      <div className="flex items-center justify-between word-ribbon-bg px-3 pt-1 border-b border-border/80 text-xs font-semibold text-muted-foreground overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'home'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
            }`}
          >
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('insert')}
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'insert'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
            }`}
          >
            <span>Insert</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'layout'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
            }`}
          >
            <span>Page Layout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs relative ${
              activeTab === 'table'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
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
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'tools'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>Bijoy & Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('view')}
            className={`px-4 py-1.5 rounded-t-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
              activeTab === 'view'
                ? 'word-ribbon-tab-active font-extrabold border-t-2 border-primary border-x'
                : 'hover:text-foreground hover:bg-card/40'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>View</span>
          </button>
        </div>

        {/* Quick Search & Window Toggle Header Actions */}
        <div className="flex items-center gap-2 pr-1">
          <button
            type="button"
            onClick={onOpenFindReplace}
            className="px-2.5 py-1 rounded bg-card/80 hover:bg-card text-foreground flex items-center gap-1 text-[11px] font-bold border border-border cursor-pointer transition-all shadow-2xs"
            title="Find & Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Find</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-all ${
              isFullscreen
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs'
            }`}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen Window Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* RIBBON TOOLBAR BODY (AUTHENTIC MS WORD 2007 RIBBON GROUPS) */}
      <div className="p-2 bg-card min-h-[92px] flex items-center overflow-x-auto select-none border-b border-border/80">
        
        {/* ── TAB 1: HOME TAB ── */}
        {activeTab === 'home' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            
            {/* GROUP 1: CLIPBOARD */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-1.5 my-auto">
                {/* Big Paste Button */}
                <button
                  type="button"
                  onClick={handlePasteAction}
                  className="flex flex-col items-center justify-center p-2 rounded hover:bg-muted/80 text-foreground cursor-pointer transition-all border border-transparent hover:border-border"
                  title="Paste (Ctrl+V)"
                >
                  <Clipboard className="w-6 h-6 text-primary" />
                  <span className="text-[10px] font-bold leading-tight mt-0.5">Paste</span>
                </button>

                {/* Stacked Cut, Copy, Format Painter */}
                <div className="flex flex-col gap-0.5 border-l border-border/60 pl-1.5">
                  <button
                    type="button"
                    onClick={handleCut}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-muted text-foreground text-[11px] font-medium cursor-pointer"
                    title="Cut (Ctrl+X)"
                  >
                    <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Cut</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-muted text-foreground text-[11px] font-medium cursor-pointer"
                    title="Copy (Ctrl+C)"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFormatPainter}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      formatPainterActive
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/40'
                        : 'hover:bg-muted text-foreground'
                    }`}
                    title="Format Painter (Copy formatting)"
                  >
                    <Paintbrush className="w-3.5 h-3.5 text-amber-600" />
                    <span>Format Painter</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Clipboard</span>
            </div>

            {/* GROUP 2: FONT */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex flex-col gap-1 my-auto">
                {/* Row 1: Font Selector, Size, Grow/Shrink, Case, Clear */}
                <div className="flex items-center gap-1">
                  <div className="w-32">
                    <CustomSelect
                      value={editor.getAttributes('textStyle').fontFamily || ''}
                      onChange={(val) => editor.chain().focus().setFontFamily(val).run()}
                      options={[
                        { value: "", label: "Calibri (Body)" },
                        { value: "Inter, sans-serif", label: "Inter" },
                        { value: "Arial, sans-serif", label: "Arial" },
                        { value: "Times New Roman, serif", label: "Times New Roman" },
                        { value: "Noto Sans Bengali, sans-serif", label: "Bangla (Noto Sans)" },
                        { value: "Kalpurush, sans-serif", label: "Bangla (Kalpurush)" },
                        { value: "SolaimanLipi, sans-serif", label: "Bangla (SolaimanLipi)" },
                        { value: "SutonnyMJ, sans-serif", label: "Bangla (Bijoy Sutonny)" }
                      ]}
                    />
                  </div>

                  <div className="w-16">
                    <CustomSelect
                      value={editor.getAttributes('textStyle').fontSize || ''}
                      onChange={(val) => {
                        if (!val) editor.chain().focus().unsetFontSize().run();
                        else editor.chain().focus().setFontSize(val).run();
                      }}
                      options={[
                        { value: "", label: "Size" },
                        { value: "10px", label: "10" },
                        { value: "11px", label: "11" },
                        { value: "12px", label: "12" },
                        { value: "14px", label: "14" },
                        { value: "16px", label: "16" },
                        { value: "18px", label: "18" },
                        { value: "20px", label: "20" },
                        { value: "24px", label: "24" },
                        { value: "28px", label: "28" },
                        { value: "32px", label: "32" },
                        { value: "36px", label: "36" }
                      ]}
                    />
                  </div>

                  {/* Grow Font & Shrink Font Buttons */}
                  <div className="flex items-center border border-border rounded overflow-hidden">
                    <button
                      type="button"
                      onClick={handleGrowFont}
                      className="px-1.5 py-1 hover:bg-muted text-foreground text-xs font-black cursor-pointer"
                      title="Grow Font (A^)"
                    >
                      A<sup>▲</sup>
                    </button>
                    <button
                      type="button"
                      onClick={handleShrinkFont}
                      className="px-1.5 py-1 hover:bg-muted text-foreground text-xs font-black border-l border-border cursor-pointer"
                      title="Shrink Font (A_)"
                    >
                      A<sub>▼</sub>
                    </button>
                  </div>

                  {/* Change Case Dropdown */}
                  <div className="w-20">
                    <CustomSelect
                      value=""
                      onChange={(val) => {
                        if (val) handleTextCaseChange(val as any);
                      }}
                      options={[
                        { value: "", label: "Aa Case" },
                        { value: "upper", label: "UPPERCASE" },
                        { value: "lower", label: "lowercase" },
                        { value: "title", label: "Title Case" },
                        { value: "sentence", label: "Sentence case" },
                        { value: "bangla_title", label: "Bangla Title" }
                      ]}
                    />
                  </div>

                  {/* Clear Formatting */}
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    className="p-1.5 rounded hover:bg-muted text-amber-600 cursor-pointer"
                    title="Clear All Formatting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Row 2: Bold, Italic, Underline, Strike, Sub/Sup, Effects, Highlight, Color */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('bold') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('italic') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Italic (Ctrl+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('underline') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Underline (Ctrl+U)"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('strike') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('subscript') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Subscript (x₂)"
                  >
                    <SubscriptIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('superscript') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Superscript (x²)"
                  >
                    <SuperscriptIcon className="w-4 h-4" />
                  </button>

                  <div className="w-px h-4 bg-border/60 mx-1" />

                  {/* Text Highlight Color */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); setShowShadingPicker(false); }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 cursor-pointer"
                      title="Text Highlight Color"
                    >
                      <Highlighter className="w-4 h-4 text-amber-500" />
                      <span className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: editor.getAttributes('highlight').color || 'transparent' }} />
                    </button>

                    {showHighlightPicker && (
                      <div className="absolute top-full left-0 mt-1 z-[100005] p-2.5 bg-popover border border-border rounded-xl shadow-xl flex flex-col gap-2 w-48">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Highlight Color</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PRESET_HIGHLIGHT_COLORS.map(c => (
                            <button
                              key={c.label}
                              type="button"
                              onClick={() => {
                                if (!c.color) editor.chain().focus().unsetHighlight().run();
                                else editor.chain().focus().toggleHighlight({ color: c.color }).run();
                                setShowHighlightPicker(false);
                              }}
                              className="p-1.5 rounded-lg border border-border flex items-center justify-center cursor-pointer hover:scale-105 transition-transform text-xs font-bold"
                              style={{ backgroundColor: c.color || '#fff' }}
                              title={c.label}
                            >
                              {c.color ? 'A' : 'None'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Font Color */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); setShowShadingPicker(false); }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 cursor-pointer"
                      title="Font Color"
                    >
                      <Palette className="w-4 h-4 text-primary" />
                      <span className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }} />
                    </button>

                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-1 z-[100005] p-2.5 bg-popover border border-border rounded-xl shadow-xl flex flex-col gap-2 w-48">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Text Color</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {PRESET_TEXT_COLORS.map(c => (
                            <button
                              key={c.label}
                              type="button"
                              onClick={() => {
                                if (!c.color) editor.chain().focus().unsetColor().run();
                                else editor.chain().focus().setColor(c.color).run();
                                setShowColorPicker(false);
                              }}
                              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                              style={{ backgroundColor: c.color || '#fff' }}
                              title={c.label}
                            >
                              {!c.color && <span className="text-xs text-muted-foreground">✖</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Font</span>
            </div>

            {/* GROUP 3: PARAGRAPH */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex flex-col gap-1 my-auto">
                {/* Row 1: Bullets, Numbers, Bangla Numbers, Multilevel, Indent, Sort, Show/Hide Marks */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive('orderedList') && !(editor.getAttributes('orderedList').style || '').includes('bengali') ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="English Numbered List (1, 2, 3)"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (editor.isActive('orderedList')) {
                        const currentStyle = editor.getAttributes('orderedList').style || '';
                        if (currentStyle.includes('bengali')) {
                          editor.chain().focus().toggleOrderedList().run();
                        } else {
                          editor.chain().focus().updateAttributes('orderedList', { style: 'list-style-type: bengali;' }).run();
                          toast.success("Set to Bangla Numerals (১, ২, ৩)");
                        }
                      } else {
                        editor.chain().focus().toggleOrderedList().updateAttributes('orderedList', { style: 'list-style-type: bengali;' }).run();
                        toast.success("Bangla Numbered List (১, ২, ৩)");
                      }
                    }}
                    className={`px-1.5 py-1 rounded hover:bg-muted flex items-center text-xs font-extrabold cursor-pointer ${
                      editor.isActive('orderedList') && (editor.getAttributes('orderedList').style || '').includes('bengali')
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-muted-foreground'
                    }`}
                    title="Bangla Numbered List (১. ২. ৩.)"
                  >
                    <span>১.২.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => editor.chain().focus().outdent().run()}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                    title="Decrease Indent"
                  >
                    <OutdentIcon className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => editor.chain().focus().indent().run()}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                    title="Increase Indent"
                  >
                    <IndentIcon className="w-4 h-4" />
                  </button>

                  {/* Sort (A-Z) */}
                  <button
                    type="button"
                    onClick={handleSortLines}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                    title="Sort Lines Alphabetically (A-Z)"
                  >
                    <ArrowDownAZ className="w-4 h-4 text-primary" />
                  </button>

                  {/* Show/Hide Paragraph Marks (¶) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowParagraphMarks(!showParagraphMarks);
                      toast.info(`Paragraph marks ${!showParagraphMarks ? 'shown' : 'hidden'}`);
                    }}
                    className={`p-1.5 rounded hover:bg-muted cursor-pointer ${showParagraphMarks ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                    title="Show/Hide Paragraph Marks (¶)"
                  >
                    <Pilcrow className="w-4 h-4" />
                  </button>
                </div>

                {/* Row 2: Alignment, Line Spacing, Shading, Borders */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                      title="Align Left (Ctrl+L)"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                      title="Align Center (Ctrl+E)"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                      title="Align Right (Ctrl+R)"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                      className={`p-1.5 rounded hover:bg-muted cursor-pointer ${editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/20 text-primary font-bold border border-primary/30' : 'text-muted-foreground'}`}
                      title="Justify (Ctrl+J)"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-20">
                    <CustomSelect
                      value={editor.getAttributes('paragraph').lineHeight || ''}
                      onChange={(val) => {
                        if (!val) editor.chain().focus().unsetLineHeight().run();
                        else editor.chain().focus().setLineHeight(val).run();
                      }}
                      options={[
                        { value: "", label: "Spacing" },
                        { value: "1.0", label: "1.0 Single" },
                        { value: "1.15", label: "1.15 Normal" },
                        { value: "1.5", label: "1.5 Medium" },
                        { value: "2.0", label: "2.0 Double" }
                      ]}
                    />
                  </div>

                  {/* Shading / Background Color */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setShowShadingPicker(!showShadingPicker); setShowColorPicker(false); setShowHighlightPicker(false); }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1 cursor-pointer"
                      title="Paragraph Shading (Background Color)"
                    >
                      <PaintBucket className="w-4 h-4 text-emerald-600" />
                    </button>

                    {showShadingPicker && (
                      <div className="absolute top-full left-0 mt-1 z-[100005] p-2.5 bg-popover border border-border rounded-xl shadow-xl flex flex-col gap-2 w-48">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Paragraph Shading</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PRESET_SHADING_COLORS.map(c => (
                            <button
                              key={c.label}
                              type="button"
                              onClick={() => {
                                if (!c.color) editor.chain().focus().unsetParagraphShading().run();
                                else editor.chain().focus().setParagraphShading(c.color).run();
                                setShowShadingPicker(false);
                              }}
                              className="p-2 rounded-lg border border-border flex items-center justify-center cursor-pointer text-[10px] font-bold truncate"
                              style={{ backgroundColor: c.color || '#fff' }}
                              title={c.label}
                            >
                              {c.color ? 'Fill' : 'None'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Paragraph</span>
            </div>

            {/* GROUP 4: QUICK STYLES GALLERY */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center max-w-[340px]">
              <div className="flex items-center gap-1.5 overflow-x-auto my-auto py-0.5 max-w-[320px]">
                {WORD_QUICK_STYLES.map((styleCard) => (
                  <button
                    key={styleCard.id}
                    type="button"
                    onClick={() => styleCard.action(editor)}
                    className="word-style-card min-w-[70px] h-[52px] px-2 py-1 bg-card rounded border border-border flex flex-col justify-center items-center text-center cursor-pointer select-none"
                    title={`${styleCard.name} - ${styleCard.desc}`}
                  >
                    <span className="text-xs font-bold leading-tight truncate w-full" style={{ color: styleCard.id === 'heading1' || styleCard.id === 'heading2' ? '#800000' : 'inherit' }}>
                      {styleCard.preview}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate w-full mt-0.5">{styleCard.name}</span>
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Styles</span>
            </div>

            {/* GROUP 5: EDITING */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex flex-col gap-1 my-auto">
                <button
                  type="button"
                  onClick={onOpenFindReplace}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-primary" />
                  <span>Find & Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().selectAll().run();
                    toast.success("Selected all document text");
                  }}
                  className="px-2.5 py-1 rounded hover:bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ruler Bar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 text-xs font-semibold border border-border cursor-pointer"
                  title="View Keyboard Shortcuts Guide (Ctrl+/)"
                >
                  <Keyboard className="w-4 h-4 text-primary" />
                  <span>Shortcuts Documentation</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Editing</span>
            </div>

          </div>
        )}

        {/* ── TAB 2: INSERT TAB ── */}
        {activeTab === 'insert' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            {/* TABLES */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(true)}
                className="my-auto p-2 rounded hover:bg-muted/80 flex flex-col items-center gap-1 text-xs font-semibold cursor-pointer"
              >
                <Grid className="w-6 h-6 text-primary" />
                <span className="text-[11px]">Table Grid</span>
              </button>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Tables</span>
            </div>

            {/* PAGES & BREAKS */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-1.5 my-auto">
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent('<hr class="page-break" style="page-break-after: always; border-top: 2px dashed #94a3b8; margin: 24px 0;" />').run();
                    toast.success("Inserted Page Break");
                  }}
                  className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-border"
                >
                  <SplitSquareVertical className="w-4 h-4 text-primary" />
                  <span>Page Break</span>
                </button>
                <button
                  type="button"
                  onClick={openLinkModal}
                  className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-border"
                >
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span>Hyperlink</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Pages & Links</span>
            </div>

            {/* ILLUSTRATIONS & SYMBOLS */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-1.5 my-auto">
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent(`
                      <blockquote style="border-left: 4px solid #800000; background: rgba(128,0,0,0.06); padding: 12px 16px; margin: 12px 0; font-style: normal; border-radius: 0 8px 8px 0;">
                        <strong>📌 Note:</strong> Official notice content...
                      </blockquote>
                    `).run();
                    toast.success("Inserted Callout Box");
                  }}
                  className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-border"
                >
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>Callout Box</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEquationModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-border"
                  title="Insert Mathematical Equations & Formulas"
                >
                  <Sigma className="w-4 h-4 text-primary" />
                  <span>Equation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSymbolModalOpen(true)}
                  className="px-3 py-1.5 rounded bg-muted/60 hover:bg-muted text-foreground flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-border"
                  title="Insert Special Symbols"
                >
                  <Omega className="w-4 h-4 text-primary" />
                  <span>Symbol</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Symbols & Boxes</span>
            </div>
          </div>
        )}

        {/* ── TAB 3: PAGE LAYOUT TAB ── */}
        {activeTab === 'layout' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-2 my-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('pageView')}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    viewMode === 'pageView' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted hover:bg-muted/80 text-foreground border-border'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Word A4 Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('fluid')}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    viewMode === 'fluid' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted hover:bg-muted/80 text-foreground border-border'
                  }`}
                >
                  <Layout className="w-4 h-4" />
                  <span>Fluid Canvas</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Page Setup</span>
            </div>
          </div>
        )}

        {/* ── TAB 4: TABLE TOOLS ── */}
        {activeTab === 'table' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            {!isTableActive ? (
              <div className="text-xs text-muted-foreground italic flex items-center gap-2 my-auto">
                <span>Place cursor inside a table cell to manage columns, rows, borders, and orientation.</span>
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="px-3 py-1 rounded bg-primary text-primary-foreground font-bold text-xs not-italic cursor-pointer hover:bg-primary/90"
                >
                  Insert Table Grid
                </button>
              </div>
            ) : (
              <>
                <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
                  <div className="flex items-center gap-1 my-auto">
                    <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 rounded bg-muted text-foreground text-xs font-medium cursor-pointer">+Col Left</button>
                    <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 rounded bg-muted text-foreground text-xs font-medium cursor-pointer">+Col Right</button>
                    <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-medium cursor-pointer">Del Col</button>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Columns</span>
                </div>

                <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
                  <div className="flex items-center gap-1 my-auto">
                    <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 rounded bg-muted text-foreground text-xs font-medium cursor-pointer">+Row Above</button>
                    <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 rounded bg-muted text-foreground text-xs font-medium cursor-pointer">+Row Below</button>
                    <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-medium cursor-pointer">Del Row</button>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Rows</span>
                </div>

                <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const currentDir = editor.getAttributes('tableCell')['data-text-direction'];
                      const nextDir = currentDir === 'vertical-rl' ? 'horizontal' : 'vertical-rl';
                      editor.chain().focus().updateAttributes('tableCell', { 'data-text-direction': nextDir }).run();
                      toast.success(`Cell rotation: ${nextDir === 'vertical-rl' ? 'Vertical 90°' : 'Horizontal'}`);
                    }}
                    className="my-auto px-2.5 py-1 rounded bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-border"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-primary" />
                    <span>Rotate Text (90°)</span>
                  </button>
                  <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Orientation</span>
                </div>

                {/* DELETE TABLE */}
                <div className="word-group-box p-1.5 flex flex-col justify-between items-center border-l border-destructive/30 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      toast.success("Deleted entire table");
                    }}
                    className="my-auto px-3 py-1.5 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Delete Entire Table"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Table</span>
                  </button>
                  <span className="text-[9px] font-bold text-destructive tracking-wider uppercase mt-auto">Table Removal</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 5: BIJOY & TOOLS ── */}
        {activeTab === 'tools' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-2 my-auto">
                <button
                  type="button"
                  onClick={() => {
                    const { from, to, empty } = editor.state.selection;
                    if (!empty) {
                      const selectedText = editor.state.doc.textBetween(from, to, ' ');
                      if (selectedText) {
                        const converted = convertBijoyToUnicode(selectedText);
                        editor.chain().focus().insertContentAt({ from, to }, converted).run();
                        toast.success("Converted Bijoy ➔ Unicode");
                      }
                    } else {
                      const htmlContent = editor.getHTML();
                      const convertedHtml = convertHtmlBijoyToUnicode(htmlContent);
                      editor.commands.setContent(convertedHtml, { emitUpdate: true });
                      toast.success("Converted Document Bijoy ➔ Unicode");
                    }
                  }}
                  className="px-3.5 py-1.5 rounded bg-primary/10 text-primary flex items-center gap-1.5 text-xs font-bold border border-primary/30 hover:bg-primary/20 transition-all cursor-pointer"
                >
                  <Languages className="w-4 h-4" />
                  <span>SutonnyMJ (Bijoy 52) ➔ Unicode Bangla</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
                    const { from, to, empty } = editor.state.selection;
                    if (!empty) {
                      const text = editor.state.doc.textBetween(from, to, ' ');
                      const converted = text.replace(/[0-9]/g, (d: string) => banglaDigits[parseInt(d, 10)]);
                      editor.chain().focus().insertContentAt({ from, to }, converted).run();
                      toast.success("Converted Digits (123 ➔ ১২৩)");
                    } else {
                      const html = editor.getHTML();
                      const converted = html.replace(/[0-9]/g, (d: string) => banglaDigits[parseInt(d, 10)]);
                      editor.commands.setContent(converted, { emitUpdate: true });
                      toast.success("Converted Document Digits (123 ➔ ১২৩)");
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1.5 text-xs font-semibold border border-border cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Digits (123 ➔ ১২৩)</span>
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Bangla Conversion</span>
            </div>

            {/* GROUP 3: HELP & SHORTCUTS */}
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="px-3.5 py-1.5 rounded bg-primary/10 text-primary flex items-center gap-1.5 text-xs font-bold border border-primary/30 hover:bg-primary/20 transition-all cursor-pointer my-auto"
                title="View Keyboard Shortcuts Guide (Ctrl+/)"
              >
                <Keyboard className="w-4 h-4 text-primary" />
                <span>Keyboard Shortcuts</span>
              </button>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Help & Info</span>
            </div>
          </div>
        )}

        {/* ── TAB 6: VIEW TAB ── */}
        {activeTab === 'view' && (
          <div className="flex items-stretch gap-2.5 w-full py-0.5 min-h-[82px]">
            <div className="word-group-box p-1.5 flex flex-col justify-between items-center">
              <div className="flex items-center gap-2 my-auto">
                <button
                  type="button"
                  onClick={() => setShowRuler(!showRuler)}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    showRuler ? 'bg-primary/20 text-primary border-primary' : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  <Ruler className="w-4 h-4" />
                  <span>Ruler Bar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-bold border border-border cursor-pointer"
                >
                  100% Zoom
                </button>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/80 tracking-wider uppercase mt-auto">Document Views</span>
            </div>
          </div>
        )}

      </div>

      {/* MODAL PORTAL 1: HYPERLINK MODAL */}
      {mounted && isLinkModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsLinkModalOpen(false)}
        >
          <div 
            className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">Hyperlink Manager</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Target URL:</label>
                <input
                  type="text"
                  placeholder="https://example.com or mailto:info@buet.ac.bd"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="openNewTab"
                  checked={linkOpenNewTab}
                  onChange={(e) => setLinkOpenNewTab(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="openNewTab" className="text-xs font-medium text-foreground cursor-pointer">
                  Open link in new browser tab (`target="_blank"`)
                </label>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
              {editor.isActive('link') ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    setIsLinkModalOpen(false);
                    toast.info("Hyperlink removed");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Remove Link</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyLink}
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  Apply Link
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PORTAL 2: TABLE SELECTION MODAL */}
      {mounted && isTableModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsTableModalOpen(false)}
        >
          <div 
            className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TableIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Insert Table Grid</h3>
                  <p className="text-xs text-muted-foreground">Select table grid size and border formatting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    Grid Size Picker
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {hoverRows > 0 && hoverCols > 0
                      ? `${hoverRows} × ${hoverCols} Table`
                      : `${customRows} × ${customCols} Selected`}
                  </span>
                </div>

                <div 
                  className="flex flex-col gap-1.5 p-3 bg-muted/40 rounded-xl border border-border/60 items-center justify-center"
                  onMouseLeave={() => { setHoverRows(0); setHoverCols(0); }}
                >
                  {Array.from({ length: 10 }).map((_, r) => (
                    <div key={r} className="flex gap-1.5">
                      {Array.from({ length: 10 }).map((_, c) => {
                        const isHighlighted = r < (hoverRows || customRows) && c < (hoverCols || customCols);
                        return (
                          <button
                            key={c}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => {
                              setHoverRows(r + 1);
                              setHoverCols(c + 1);
                            }}
                            onClick={() => {
                              const rows = r + 1;
                              const cols = c + 1;
                              setCustomRows(rows);
                              setCustomCols(cols);
                              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).updateAttributes('table', { 'data-border': tableBorderOption }).run();
                              setIsTableModalOpen(false);
                              toast.success(`Inserted ${rows}×${cols} table`);
                            }}
                            className={`w-7 h-7 rounded-md border transition-all cursor-pointer transform hover:scale-105 ${
                              isHighlighted
                                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                : "bg-background border-border/80 hover:border-muted-foreground"
                            }`}
                            title={`${r + 1} × ${c + 1} Table`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: customRows, cols: customCols, withHeaderRow: true }).updateAttributes('table', { 'data-border': tableBorderOption }).run();
                  setIsTableModalOpen(false);
                  toast.success(`Inserted ${customRows}×${customCols} table`);
                }}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <TableIcon className="w-4 h-4" />
                <span>Insert Table</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PORTAL 3: SYMBOL PICKER MODAL */}
      {mounted && isSymbolModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsSymbolModalOpen(false)}
        >
          <div 
            className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[88vh] overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Omega className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Special Symbols Picker</h3>
                  <p className="text-xs text-muted-foreground">Click any symbol to insert directly into document</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSymbolModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-border/60 bg-card flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search symbols..."
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-background/50">
              {SYMBOL_CATEGORIES.map((cat) => {
                if (selectedCategory !== "All" && cat.name !== selectedCategory && !symbolSearch) return null;

                const filteredSymbols = cat.symbols.filter(sym =>
                  !symbolSearch || sym.includes(symbolSearch) || cat.name.toLowerCase().includes(symbolSearch.toLowerCase())
                );

                if (filteredSymbols.length === 0) return null;

                return (
                  <div key={cat.name}>
                    <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                      <span>{cat.name}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </h4>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                      {filteredSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            editor.chain().focus().insertContent(sym).run();
                            toast.success(`Inserted symbol: ${sym}`);
                          }}
                          className="h-12 w-12 rounded-xl bg-card hover:bg-primary hover:text-primary-foreground border border-border text-xl font-bold flex items-center justify-center shadow-2xs transition-all transform hover:scale-110 cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSymbolModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PORTAL 4: EQUATION PICKER MODAL */}
      {mounted && isEquationModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsEquationModalOpen(false)}
        >
          <div 
            className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[88vh] overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sigma className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Insert Mathematical Equation</h3>
                  <p className="text-xs text-muted-foreground">Select a formula preset or type a custom math expression</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEquationModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search & Custom Input */}
            <div className="px-6 py-3 border-b border-border/60 bg-card flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search equations..."
                    value={equationSearch}
                    onChange={(e) => setEquationSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Quick Insert Custom Equation */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Custom equation (e.g. E = mc²)..."
                    value={customEquationInput}
                    onChange={(e) => setCustomEquationInput(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:w-64"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customEquationInput.trim()) return;
                      editor.chain().focus().insertContent(`<span class="math-equation font-mono bg-muted/40 px-2.5 py-1 rounded border border-border inline-block">${customEquationInput}</span> `).run();
                      toast.success("Inserted custom equation");
                      setCustomEquationInput('');
                      setIsEquationModalOpen(false);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    Insert Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Equation Presets Grid */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-background/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {EQUATION_PRESETS.filter(eq => 
                  !equationSearch || 
                  eq.name.toLowerCase().includes(equationSearch.toLowerCase()) || 
                  eq.formula.toLowerCase().includes(equationSearch.toLowerCase()) ||
                  eq.category.toLowerCase().includes(equationSearch.toLowerCase())
                ).map((eq) => (
                  <div
                    key={eq.name}
                    onClick={() => {
                      editor.chain().focus().insertContent(`${eq.html} `).run();
                      toast.success(`Inserted ${eq.name}`);
                      setIsEquationModalOpen(false);
                    }}
                    className="p-4 rounded-xl bg-card hover:bg-muted/60 border border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{eq.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{eq.category}</span>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/80 flex items-center justify-center font-mono text-sm overflow-x-auto" dangerouslySetInnerHTML={{ __html: eq.html }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEquationModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PORTAL 5: KEYBOARD SHORTCUTS GUIDE MODAL */}
      {mounted && isShortcutsModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div 
            className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Keyboard Shortcuts Documentation</h3>
                  <p className="text-xs text-muted-foreground">Quick reference for MS Word ribbon & editor keyboard shortcuts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-6 py-3 border-b border-border/60 bg-card">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search shortcuts (e.g. indent, bold, align, copy, find)..."
                  value={shortcutsSearch}
                  onChange={(e) => setShortcutsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Shortcuts List Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-background/50">
              {KEYBOARD_SHORTCUTS_DATA.map((cat) => {
                const filtered = cat.shortcuts.filter(s =>
                  !shortcutsSearch ||
                  s.key.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
                  s.desc.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
                  cat.category.toLowerCase().includes(shortcutsSearch.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div key={cat.category}>
                    <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                      <span>{cat.category}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {filtered.map((item) => (
                        <div
                          key={item.key + item.desc}
                          className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <span className="text-xs text-foreground font-medium">{item.desc}</span>
                          <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold bg-muted/80 text-primary rounded-md border border-border/80 shadow-2xs whitespace-nowrap">
                            {item.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// FIND & REPLACE DRAWER COMPONENT
const FindReplaceDrawer = ({ 
  isOpen, 
  onClose, 
  editor 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  editor: any; 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!editor || !searchTerm) {
      setMatchCount(0);
      return;
    }
    const html = editor.getHTML() || '';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = html.match(regex);
    setMatchCount(matches ? matches.length : 0);
  }, [searchTerm, editor]);

  if (!isOpen || !editor) return null;

  const handleReplace = () => {
    if (!searchTerm) return;
    const content = editor.getHTML();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (regex.test(content)) {
      const updated = content.replace(regex, replaceTerm);
      editor.commands.setContent(updated, { emitUpdate: true });
      toast.success(`Replaced match`);
    } else {
      toast.info("No match found");
    }
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;
    const content = editor.getHTML();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const updated = content.replace(regex, replaceTerm);
    editor.commands.setContent(updated, { emitUpdate: true });
    toast.success(`Replaced all occurrences`);
  };

  return (
    <div className="bg-card border-b border-border p-3 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-150 shadow-md">
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <Search className="w-4 h-4" />
        <span>Find & Replace:</span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Find text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary flex-1"
        />
        <input
          type="text"
          placeholder="Replace with..."
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary flex-1"
        />
      </div>

      {searchTerm && (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">
          {matchCount} match{matchCount !== 1 ? 'es' : ''}
        </span>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleReplace}
          className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 rounded-lg cursor-pointer border border-border"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={handleReplaceAll}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer shadow-2xs"
        >
          Replace All
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted text-muted-foreground rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// MS WORD TOP RULER COMPONENT
const WordRuler = () => {
  return (
    <div className="word-ruler h-6 w-full flex items-center px-8 border-b text-[9px] font-bold text-muted-foreground select-none relative overflow-hidden">
      <div className="flex justify-between w-full max-w-[210mm] mx-auto px-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center relative">
            <span className="text-[8px] leading-none mb-0.5">{i}</span>
            <div className="w-px h-2 bg-muted-foreground/50" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function RichTextEditor({ 
  content, 
  onChange,
  className = "p-4 min-h-[300px]",
  editable = true
}: { 
  content: string; 
  onChange: (html: string) => void;
  className?: string;
  editable?: boolean;
}) {
  const [viewMode, setViewMode] = useState<'fluid' | 'pageView'>('fluid');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParagraphMarks, setShowParagraphMarks] = useState(false);
  const [showRuler, setShowRuler] = useState(true);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isFullscreen]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphShading,
      Indent,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      CharacterCount,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      CustomTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
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
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none h-full ${className} ${showParagraphMarks ? 'show-paragraph-marks' : ''}`,
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
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setIsFindReplaceOpen(true);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content]);

  const wordCount = editor?.storage.characterCount.words() || 0;
  const charCount = editor?.storage.characterCount.characters() || 0;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 350));

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-[99999] bg-background text-foreground flex flex-col h-screen w-screen overflow-hidden"
        : `flex flex-col w-full h-full bg-background overflow-hidden border border-border rounded-xl shadow-xs ${!editable ? 'opacity-70 cursor-not-allowed' : ''}`
    }>
      {editable && (
        <>
          <MenuBar 
            editor={editor} 
            viewMode={viewMode}
            setViewMode={setViewMode}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            onOpenFindReplace={() => setIsFindReplaceOpen(true)}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            showParagraphMarks={showParagraphMarks}
            setShowParagraphMarks={setShowParagraphMarks}
            showRuler={showRuler}
            setShowRuler={setShowRuler}
          />
          <FindReplaceDrawer
            isOpen={isFindReplaceOpen}
            onClose={() => setIsFindReplaceOpen(false)}
            editor={editor}
          />
          {showRuler && <WordRuler />}
        </>
      )}

      {/* EDITOR CANVAS AREA */}
      <div 
        className={`flex-1 overflow-y-auto ${viewMode === 'pageView' ? 'bg-muted/70 dark:bg-zinc-900 p-6 flex justify-center' : 'p-6 bg-background'} ${!editable ? 'pointer-events-none' : ''}`}
        style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined, transformOrigin: 'top center' }}
      >
        <div className={
          viewMode === 'pageView'
            ? "w-full max-w-[210mm] min-h-[297mm] bg-card p-[20mm] shadow-2xl border border-border rounded-sm relative my-2 flex flex-col"
            : "h-full w-full"
        }>
          <EditorContent editor={editor} className="h-full cursor-text flex-1" />
        </div>
      </div>

      {/* AUTHENTIC MS WORD 2007 STATUS BAR FOOTER */}
      {editable && editor && (
        <div className="bg-muted/90 px-4 py-1 border-t border-border flex items-center justify-between text-[11px] font-bold text-muted-foreground select-none">
          {/* Left info */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Page {estimatedPages} of {estimatedPages}</span>
            </span>
            <span>{wordCount} Words</span>
            <span>{charCount} Characters</span>
            <span className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] text-foreground">English / বাংলা</span>
          </div>

          {/* Right controls: View shortcuts & Interactive Zoom Slider */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border-r border-border pr-3">
              <button
                type="button"
                onClick={() => setViewMode('pageView')}
                className={`p-1 rounded cursor-pointer ${viewMode === 'pageView' ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-card text-muted-foreground'}`}
                title="Print Layout View"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('fluid')}
                className={`p-1 rounded cursor-pointer ${viewMode === 'fluid' ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-card text-muted-foreground'}`}
                title="Fluid Canvas View"
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel(Math.max(75, zoomLevel - 10))}
                className="p-0.5 hover:bg-card rounded cursor-pointer text-xs font-bold"
                title="Zoom Out"
              >
                -
              </button>
              <input
                type="range"
                min={75}
                max={150}
                step={5}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
                className="w-20 accent-primary cursor-pointer h-1.5 rounded bg-muted-foreground/30"
              />
              <button
                type="button"
                onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                className="p-0.5 hover:bg-card rounded cursor-pointer text-xs font-bold"
                title="Zoom In"
              >
                +
              </button>
              <span className="w-10 text-right text-[11px] font-extrabold text-primary">{zoomLevel}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
