"use client";

import { useEffect } from "react";
import { isBijoyText, convertBijoyToUnicode } from "../lib/bijoyToUnicode";
import { toast } from "sonner";

export default function BijoyGlobalPasteProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore elements managed by TipTap (contenteditable) as RichTextEditor handles them natively
      if (target.isContentEditable || target.closest('.ProseMirror')) return;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const inputElement = target as HTMLInputElement | HTMLTextAreaElement;
        const pastedText = e.clipboardData?.getData('text/plain');

        if (pastedText && isBijoyText(pastedText)) {
          e.preventDefault();
          const converted = convertBijoyToUnicode(pastedText);

          const start = inputElement.selectionStart || 0;
          const end = inputElement.selectionEnd || 0;
          const currentVal = inputElement.value || '';
          const newVal = currentVal.substring(0, start) + converted + currentVal.substring(end);

          // Dispatch native React input change event
          const nativeSetter =
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set ||
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;

          if (nativeSetter) {
            nativeSetter.call(inputElement, newVal);
          } else {
            inputElement.value = newVal;
          }

          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.setSelectionRange(start + converted.length, start + converted.length);

          toast.info("Bijoy font text auto-converted to Unicode Bangla");
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste, true);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste, true);
    };
  }, []);

  return <>{children}</>;
}
