import { ClipboardEvent } from 'react';
import { isBijoyText, convertBijoyToUnicode } from '../lib/bijoyToUnicode';
import { toast } from 'sonner';

/**
 * Handle paste event for HTML input and textarea fields to auto-convert Bijoy (ANSI) text to Unicode Bangla.
 */
export function handleBijoyInputPaste(
  e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  onConverted?: (newVal: string) => void
) {
  const pastedText = e.clipboardData?.getData('text/plain');
  if (pastedText && isBijoyText(pastedText)) {
    e.preventDefault();
    const converted = convertBijoyToUnicode(pastedText);
    const target = e.currentTarget;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentVal = target.value;
    const newVal = currentVal.substring(0, start) + converted + currentVal.substring(end);

    target.value = newVal;

    if (onConverted) {
      onConverted(newVal);
    }
    toast.info("Bijoy font text auto-converted to Unicode Bangla");
  }
}
