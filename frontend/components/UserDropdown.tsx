"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LayoutGrid, User, LogOut } from 'lucide-react';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors border border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <User className="w-5 h-5 text-primary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-popover text-popover-foreground shadow-lg border border-border rounded-md py-1 z-50">
          <div className="px-4 py-2 border-b border-border/50">
            <p className="text-sm font-medium">Samyo Pramanik</p>
            <p className="text-xs text-muted-foreground truncate">admin@buet.ac.bd</p>
          </div>
          
          <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
          
          <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Link>
          
          <div className="border-t border-border/50 my-1"></div>
          
          <button 
            onClick={() => {
                setIsOpen(false);
                // Perform sign out action
            }} 
            className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
