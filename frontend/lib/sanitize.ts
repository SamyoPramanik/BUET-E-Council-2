import DOMPurify from "dompurify";

// Agenda/resolution/meeting content and templates are stored as rich-text
// HTML that moderators can edit, then rendered via dangerouslySetInnerHTML
// for other users (including admins) to view. Sanitize before render so a
// moderator can't smuggle a script into a viewer's or admin's session.
export function convertMarkdownTablesToHtml(content: string): string {
  if (!content || typeof content !== "string") return content || "";
  if (!content.includes("|")) return content;

  return content.replace(/(?:<p[^>]*>)?\s*([^|\n<]+(?:\|[^|\n<]+)+)\s*\|?\s*[:\-]{2,}[:\-\s|]*\|?\s*([^<]+?)(?:<\/p>|$)/gi, (match, headerRow, bodyRows) => {
    const headers = headerRow.split("|").map((s: string) => s.replace(/<[^>]*>/g, "").trim()).filter((s: string) => s && !/^[-:]+$/.test(s));
    if (headers.length === 0) return match;

    let html = '<table class="meeting-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;border:1px solid #000;"><thead><tr>';
    headers.forEach((h: string) => {
      html += `<th style="border:1px solid #000;padding:6px;background-color:rgba(0,0,0,0.05);font-weight:600;text-align:left;">${h}</th>`;
    });
    html += "</tr></thead><tbody>";

    const rowTokens = bodyRows.split(/(?:\|?\s*\||\n+)/).map((r: string) => r.trim()).filter(Boolean);
    rowTokens.forEach((rowStr: string) => {
      const cells = rowStr.split("|").map((s: string) => s.replace(/<[^>]*>/g, "").trim()).filter((s: string) => s.length > 0 && !/^[-:]+$/.test(s));
      if (cells.length > 0) {
        html += "<tr>";
        cells.forEach((c: string) => {
          html += `<td style="border:1px solid #000;padding:6px;">${c}</td>`;
        });
        html += "</tr>";
      }
    });
    html += "</tbody></table>";
    return html;
  });
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  // Decode escaped HTML entities (e.g. &lt;br&gt; -> <br>)
  const unescaped = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const converted = convertMarkdownTablesToHtml(unescaped);
  return DOMPurify.sanitize(converted, {
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "br", "p", "strong", "em", "b", "i", "u", "span"],
    ADD_ATTR: ["class", "border", "cellpadding", "cellspacing", "style"]
  });
}
