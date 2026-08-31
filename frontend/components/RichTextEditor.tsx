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
import { Extension } from '@tiptap/core';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo,
  Table as TableIcon, LayoutTemplate, Trash2, Columns, Rows, Settings, Languages,
  Omega, ChevronDown, Maximize2, Search, X
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback, type CSSProperties } from 'react';
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
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

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
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

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

const MenuBar = ({ editor }: { editor: any }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'table' | 'tools'>('home');
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableBorderOption, setTableBorderOption] = useState<string>('full');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTableModalOpen) setIsTableModalOpen(false);
        if (isSymbolModalOpen) setIsSymbolModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTableModalOpen, isSymbolModalOpen]);

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
      <div className="p-3 bg-card min-h-[62px] flex items-center overflow-x-auto">
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

              {/* Font Size Selector */}
              <div className="w-24">
                <CustomSelect
                  value={editor.getAttributes('textStyle').fontSize || ''}
                  onChange={(val) => {
                    if (!val) {
                      editor.chain().focus().unsetFontSize().run();
                    } else {
                      editor.chain().focus().setFontSize(val).run();
                    }
                  }}
                  options={[
                    { value: "", label: "Size" },
                    { value: "10px", label: "10px" },
                    { value: "12px", label: "12px" },
                    { value: "14px", label: "14px" },
                    { value: "16px", label: "16px" },
                    { value: "18px", label: "18px" },
                    { value: "20px", label: "20px" },
                    { value: "24px", label: "24px" },
                    { value: "28px", label: "28px" },
                    { value: "32px", label: "32px" }
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
          <div className="flex items-center gap-3 relative">
            {/* Table Insertion Modal Trigger Button */}
            <button
              type="button"
              onClick={() => setIsTableModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-muted/70 hover:bg-muted text-foreground flex items-center gap-2 text-xs font-semibold border border-border cursor-pointer transition-all hover:shadow-xs"
              title="Open Table Size & Border Modal"
            >
              <TableIcon className="w-4 h-4 text-primary" />
              <span>Insert Table</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Bullet Points Button */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                editor.isActive('bulletList')
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                  : 'bg-muted/70 hover:bg-muted text-foreground border-border hover:shadow-xs'
              }`}
              title="Insert Bullet Points (Bulleted List)"
            >
              <List className="w-4 h-4 text-primary" />
              <span>Bullet Points</span>
            </button>

            {/* Numbered List Button */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                editor.isActive('orderedList')
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                  : 'bg-muted/70 hover:bg-muted text-foreground border-border hover:shadow-xs'
              }`}
              title="Insert Numbered List"
            >
              <ListOrdered className="w-4 h-4 text-primary" />
              <span>Numbered List</span>
            </button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Symbol Picker Button */}
            <button
              type="button"
              onClick={() => setIsSymbolModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center gap-2 text-xs font-semibold border border-border cursor-pointer transition-colors"
              title="Insert Special Symbol"
            >
              <Omega className="w-4 h-4 text-primary" />
              <span>Insert Symbol</span>
            </button>

            {/* SPACIOUS UNCLIPPED TABLE SELECTION MODAL */}
            {mounted && isTableModalOpen && createPortal(
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                onClick={() => setIsTableModalOpen(false)}
              >
                <div 
                  className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <TableIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Insert Table</h3>
                        <p className="text-xs text-muted-foreground">Select table grid size and border formatting</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTableModalOpen(false)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      title="Cancel / Close (Do not insert table)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 flex flex-col gap-5">
                    {/* Visual Grid Picker Section */}
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

                      {/* 10x10 Interactive Grid */}
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
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
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

                    {/* Table Border Style Selection */}
                    <div>
                      <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                        Border Style
                      </span>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: "full", label: "Full Grid", icon: "🔳" },
                          { id: "horizontal", label: "Horizontal", icon: "🔲" },
                          { id: "dashed", label: "Dashed", icon: "░" },
                          { id: "thick", label: "Heavy Outer", icon: "◼" },
                          { id: "none", label: "Borderless", icon: "🚫" }
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setTableBorderOption(b.id)}
                            className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                              tableBorderOption === b.id
                                ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                                : "bg-card border-border hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <span className="text-base">{b.icon}</span>
                            <span className="text-[11px] truncate w-full text-center">{b.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Dimension Inputs */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-3 text-xs flex-1">
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-semibold text-muted-foreground">Rows:</span>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={customRows}
                            onChange={(e) => setCustomRows(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 rounded-lg bg-background border border-border text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-semibold text-muted-foreground">Cols:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={customCols}
                            onChange={(e) => setCustomCols(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 rounded-lg bg-background border border-border text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsTableModalOpen(false)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                      title="Do not add table"
                    >
                      <X className="w-4 h-4 text-destructive" />
                      <span>Cancel (Do Not Add Table)</span>
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
                      <span>Insert {customRows} × {customCols} Table</span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* EXPANDED SYMBOL PICKER MODAL */}
            {mounted && isSymbolModalOpen && createPortal(
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                onClick={() => setIsSymbolModalOpen(false)}
              >
                <div 
                  className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[88vh] overflow-hidden select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Omega className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold">Special Symbols Picker</h3>
                        <p className="text-xs text-muted-foreground">Select and click any symbol to insert directly into document</p>
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

                  {/* Modal Search & Category Filter Pills */}
                  <div className="px-6 py-3 border-b border-border/60 bg-card flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Search Bar */}
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

                      {/* Live Preview Box */}
                      <div className="flex items-center gap-4 w-full sm:w-auto bg-muted/40 px-4 py-2 rounded-xl border border-border">
                        <span className="text-xs font-semibold text-muted-foreground">Active Selection:</span>
                        <div className="text-4xl font-extrabold text-primary w-12 text-center">
                          {hoveredSymbol || "Ω"}
                        </div>
                        {hoveredSymbol && (
                          <button
                            type="button"
                            onClick={() => {
                              editor.chain().focus().insertContent(hoveredSymbol).run();
                              toast.success(`Inserted symbol: ${hoveredSymbol}`);
                            }}
                            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 cursor-pointer"
                          >
                            Insert Symbol
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                      {["All", ...SYMBOL_CATEGORIES.map(c => c.name)].map((catName) => (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(catName);
                            setSymbolSearch('');
                          }}
                          className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                            (selectedCategory === catName && !symbolSearch)
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {catName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal Symbols List */}
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
                                onMouseEnter={() => setHoveredSymbol(sym)}
                                onClick={() => {
                                  editor.chain().focus().insertContent(sym).run();
                                  toast.success(`Inserted symbol: ${sym}`);
                                }}
                                className="h-14 w-14 rounded-xl bg-card hover:bg-primary hover:text-primary-foreground border border-border/80 text-2xl font-bold flex items-center justify-center shadow-xs transition-all transform hover:scale-110 cursor-pointer"
                                title={`Insert ${sym}`}
                              >
                                {sym}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsSymbolModalOpen(false)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsTableModalOpen(true)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs not-italic cursor-pointer hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Insert Table Now
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold uppercase text-primary tracking-wider mr-2">Table Actions:</span>
                
                <div className="flex items-center gap-1 pr-2 border-r border-border/60">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Columns className="w-3.5 h-3.5 text-primary" /> +Left
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Columns className="w-3.5 h-3.5 text-primary" /> +Right
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 rounded hover:bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Del Col
                  </button>
                </div>

                <div className="flex items-center gap-1 px-2 border-r border-border/60">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Rows className="w-3.5 h-3.5 text-primary" /> +Above
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Rows className="w-3.5 h-3.5 text-primary" /> +Below
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 rounded hover:bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Del Row
                  </button>
                </div>

                <div className="flex items-center gap-1 px-2 border-r border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">Border:</span>
                  <div className="w-36">
                    <CustomSelect
                      value={editor.getAttributes('table')['data-border'] || 'full'}
                      onChange={(val) => {
                        editor.chain().focus().updateAttributes('table', { 'data-border': val }).run();
                        toast.success("Table border style updated");
                      }}
                      options={[
                        { value: "full", label: "🔳 Full Grid" },
                        { value: "horizontal", label: "🔲 Horizontal Only" },
                        { value: "dashed", label: "░ Dashed Grid" },
                        { value: "thick", label: "◼ Heavy Outer" },
                        { value: "none", label: "🚫 Borderless" }
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2">
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <Settings className="w-3.5 h-3.5 text-primary" /> Toggle Header
                  </button>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1 hover:bg-destructive/20 cursor-pointer">
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
  className = "p-4 min-h-[300px]",
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
      FontSize,
      CustomTable.configure({ resizable: true }),
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

