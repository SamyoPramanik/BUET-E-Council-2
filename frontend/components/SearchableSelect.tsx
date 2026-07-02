"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

interface Option {
  value: string; // The ID
  label: string; // The display name
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: (newValue: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = "Select option...",
  emptyMessage = "No options found."
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
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
      const dropdownElement = document.getElementById('searchable-select-dropdown');
      const isOutsideDropdown = dropdownElement ? !dropdownElement.contains(target) : true;
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="flex items-center justify-between w-full px-3 py-2 bg-input/20 border border-input rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 opacity-50" />
      </div>

      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div id="searchable-select-dropdown" style={dropdownStyle} className="bg-popover text-popover-foreground border border-border rounded-md shadow-xl flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border/50 shrink-0 bg-popover">
            <input
              type="text"
              className="w-full px-2 py-1.5 text-sm bg-input/20 border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 bg-popover">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`flex items-center px-2 py-2 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${value === opt.value ? 'bg-accent/50 font-medium text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={`w-4 h-4 mr-2 ${value === opt.value ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                  {opt.label}
                </div>
              ))
            )}
          </div>
          
          {onAddNew && search && !options.find(opt => opt.label.toLowerCase() === search.toLowerCase()) && (
            <div 
              className="p-2.5 border-t border-border/50 bg-muted/30 cursor-pointer hover:bg-accent transition-colors text-sm flex items-center text-primary font-medium shrink-0"
              onClick={() => {
                onAddNew(search);
                setIsOpen(false);
                setSearch('');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add "{search}"
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
