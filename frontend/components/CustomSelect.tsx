"use client";

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  className = ""
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      const dropdownElement = document.getElementById('custom-select-dropdown');
      const isOutsideDropdown = dropdownElement ? !dropdownElement.contains(target) : true;
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring text-sm ${className || 'bg-input/20 border-input text-foreground'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "" : "text-muted-foreground"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 opacity-50" />
      </div>

      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div id="custom-select-dropdown" style={dropdownStyle} className="bg-popover text-popover-foreground border border-border rounded-md shadow-xl flex flex-col overflow-hidden">
          <div className="max-h-60 overflow-y-auto p-1 bg-popover">
            {options.length === 0 ? (
              <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                No options available
              </div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.value}
                  className={`flex items-center px-2 py-2 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${value === opt.value ? 'bg-accent/50 font-medium text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <Check className={`w-4 h-4 mr-2 ${value === opt.value ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
