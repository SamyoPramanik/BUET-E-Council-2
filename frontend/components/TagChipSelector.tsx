"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, X, Search } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
}

interface TagChipSelectorProps {
  options: Tag[];
  value: string[];
  onChange: (value: string[]) => void;
  onAddNew?: (name: string) => void;
  placeholder?: string;
}

export default function TagChipSelector({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = "Add Tag"
}: TagChipSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 220; // estimate max height

      const renderAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: 'fixed',
        top: renderAbove ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 240),
        maxHeight: `${dropdownHeight}px`,
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Keep dropdown aligned during scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      // Auto-focus input when opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const dropdownElement = document.getElementById('tag-chipselector-dropdown');
      const isOutsideDropdown = dropdownElement ? !dropdownElement.contains(target) : true;

      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = value
    .map(id => options.find(opt => opt.id === id))
    .filter((t): t is Tag => !!t);

  const toggleTag = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
    inputRef.current?.focus();
  };

  const removeTag = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      // Check if there is a exact match first
      const exactMatch = options.find(opt => opt.name.toLowerCase() === search.trim().toLowerCase());
      if (exactMatch) {
        if (!value.includes(exactMatch.id)) {
          toggleTag(exactMatch.id);
        }
        setSearch('');
      } else if (onAddNew) {
        onAddNew(search.trim());
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1" ref={containerRef}>
      {/* Active Tags as Chips */}
      {selectedTags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-xs transition-all hover:bg-primary/15 animate-in fade-in zoom-in-95 duration-150"
        >
          {tag.name}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
            className="hover:bg-primary/20 rounded-full p-0.5 text-primary/80 hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {/* Trigger & Input Area */}
      <div className="relative flex items-center min-h-[26px]">
        {isOpen ? (
          <div className="flex items-center bg-input/10 border border-input rounded-md px-2 py-0.5 w-40 transition-all shadow-inner focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <Search className="w-3 h-3 text-muted-foreground mr-1 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/60 border-none p-0 focus:ring-0"
              placeholder="Search or add..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-transparent border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 px-2.5 py-0.5 rounded-full transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {placeholder}
          </button>
        )}
      </div>

      {/* Dropdown Portal */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          id="tag-chipselector-dropdown" 
          style={dropdownStyle} 
          className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="max-h-48 overflow-y-auto p-1 bg-popover">
            {filteredOptions.length === 0 ? (
              <div className="py-2.5 px-3 text-xs text-muted-foreground text-center">No matching tags.</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${isSelected ? 'bg-accent/40 font-medium text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => toggleTag(opt.id)}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Inline Create Option */}
          {onAddNew && search.trim() && !options.find(opt => opt.name.toLowerCase() === search.trim().toLowerCase()) && (
            <div
              className="p-2 border-t border-border bg-muted/20 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-xs flex items-center justify-between text-primary font-semibold shrink-0"
              onClick={() => {
                onAddNew(search.trim());
                setSearch('');
              }}
            >
              <span className="truncate">Create "{search.trim()}"</span>
              <Plus className="w-3.5 h-3.5 shrink-0" />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
