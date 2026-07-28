import DOMPurify from "dompurify";

// Agenda/resolution/meeting content and templates are stored as rich-text
// HTML that moderators can edit, then rendered via dangerouslySetInnerHTML
// for other users (including admins) to view. Sanitize before render so a
// moderator can't smuggle a script into a viewer's or admin's session.
export function convertMarkdownTablesToHtml(content: string): string {
  if (!content || typeof content !== "string") return content || "";
  // If content already contains an HTML table, leave it completely untouched!
  if (content.includes("<table") || content.includes("<TABLE")) return content;
  if (!content.includes("|")) return content;

  const mdTableRegex = /(?:(?:^|\n|<p[^>]*>|<br\s*\/?>)\s*)([^\n<]+?\|[^\n<]+?(?:[\r\n]|<br\s*\/?>)\s*\|?\s*[:\-]{2,}(?:\s*\|\s*[:\-]{2,})+\s*\|?(?:[\r\n]|<br\s*\/?>)\s*(?:[^\n<]+?\|[^\n<]+?(?:[\r\n]|<br\s*\/?>|$))+)/gi;

  return content.replace(mdTableRegex, (match) => {
    const rawLines = match.replace(/<\/?p[^>]*>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").split("\n").map(l => l.trim()).filter(Boolean);
    const sepIdx = rawLines.findIndex(l => /^\|?\s*[:\-]{2,}(?:\s*\|\s*[:\-]{2,})+\s*\|?$/.test(l));
    if (sepIdx <= 0) return match;

    const headerLine = rawLines[sepIdx - 1];
    const dataLines = rawLines.slice(sepIdx + 1);

    const headers = headerLine.split("|").map(s => s.trim()).filter((s, i, arr) => !(i === 0 && s === "") && !(i === arr.length - 1 && s === ""));
    if (headers.length === 0) return match;

    let html = '<table class="meeting-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;border:1px solid #000;"><thead><tr>';
    headers.forEach(h => {
      html += `<th style="border:1px solid #000;padding:6px;background-color:rgba(0,0,0,0.05);font-weight:600;text-align:left;">${h}</th>`;
    });
    html += "</tr></thead><tbody>";

    dataLines.forEach(dLine => {
      const cells = dLine.split("|").map(s => s.trim()).filter((s, i, arr) => !(i === 0 && s === "") && !(i === arr.length - 1 && s === ""));
      if (cells.length > 0) {
        html += "<tr>";
        cells.forEach(c => {
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
