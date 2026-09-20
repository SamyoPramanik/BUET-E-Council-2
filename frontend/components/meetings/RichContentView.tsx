"use client";

import { usePageTextWidthMm } from "../RichTextEditor";
import { sanitizeHtml } from "../../lib/sanitize";

/**
 * Read-only rich text drawn the way the editor and the PDF draw it: the same
 * font (see `.rich-content` in globals.css) and the same text width (the meeting
 * page's width minus its side margins), so lines break in the same places.
 * On a screen narrower than the page it shrinks to fit.
 */
export default function RichContentView({ html, className = "" }: { html: string; className?: string }) {
  const widthMm = usePageTextWidthMm();
  return (
    <div
      className={`rich-content prose prose-sm dark:prose-invert max-w-none text-foreground ${className}`}
      style={{ width: `${widthMm}mm`, maxWidth: "100%" }}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
