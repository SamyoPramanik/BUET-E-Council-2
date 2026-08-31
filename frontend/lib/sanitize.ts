import DOMPurify from "dompurify";

// Agenda/resolution/meeting content and templates are stored as rich-text
// HTML that moderators can edit, then rendered via dangerouslySetInnerHTML
// for other users (including admins) to view. Sanitize before render so a
// moderator can't smuggle a script into a viewer's or admin's session.
export function convertMarkdownTablesToHtml(content: string): string {
  if (!content || typeof content !== "string") return content || "";
  if (content.includes("<table") || content.includes("<TABLE")) return content;
  if (!content.includes("|")) return content;

  // Step 1: Replace line breaks and paragraph tags with newlines
  let raw = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n");

  // Step 2: Replace double pipes `| |` -> `|\n|`
  raw = raw.replace(/\|\s*\|/g, "|\n|");

  const isSep = (str: string) => /^\|?\s*[:\-]{2,}(?:\s*\|\s*[:\-]{2,})*\s*\|?$/.test(str.trim());

  let rawLines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let lines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (i + 1 < rawLines.length && isSep(rawLines[i + 1])) {
      if (line.includes("|")) {
        let parts = line.split("|").map(s => s.trim());
        let items: string[] = [];
        for (let k = 0; k < parts.length; k++) {
          let p = parts[k];
          if (!p) continue;
          if (k > 0 && k < parts.length - 1) {
            items.push(`| ${p} |`);
          } else {
            items.push(p);
          }
        }
        if (items.length > 1) {
          items.forEach(it => lines.push(it));
          continue;
        }
      }
    }
    lines.push(line);
  }

  let result: string[] = [];
  let idx = 0;

  while (idx < lines.length) {
    if (idx + 1 < lines.length && isSep(lines[idx + 1])) {
      let headerRaw = lines[idx];

      let leadText = "";
      let headerTablePart = headerRaw;
      const firstPipeIdx = headerRaw.indexOf("|");
      if (firstPipeIdx > 0) {
        leadText = headerRaw.substring(0, firstPipeIdx).trim();
        headerTablePart = headerRaw.substring(firstPipeIdx).trim();
      }

      if (leadText) {
        result.push(`<p>${leadText}</p>`);
      }

      let dataLines: string[] = [];
      let j = idx + 2;

      while (j < lines.length) {
        let curLine = lines[j];
        if (!curLine || isSep(curLine)) break;
        if (j + 1 < lines.length && isSep(lines[j + 1])) break;
        if (j + 2 < lines.length && isSep(lines[j + 2])) break;
        if (curLine.includes("|")) {
          dataLines.push(curLine);
          j++;
        } else {
          break;
        }
      }

      const headers = headerTablePart.split("|").map(s => s.trim()).filter((s, k, arr) => !(k === 0 && s === "") && !(k === arr.length - 1 && s === ""));
      if (headers.length === 0 && headerTablePart) headers.push(headerTablePart.replace(/\|/g, "").trim());

      let tableHtml = `<table class="meeting-table" border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;border:1px solid #000;"><thead><tr>`;
      headers.forEach(h => {
        tableHtml += `<th style="border:1px solid #000;padding:6px;background-color:rgba(0,0,0,0.05);font-weight:600;text-align:left;">${h}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;

      dataLines.forEach(dLine => {
        const cells = dLine.split("|").map(s => s.trim()).filter((s, k, arr) => !(k === 0 && s === "") && !(k === arr.length - 1 && s === ""));
        if (cells.length > 0) {
          tableHtml += `<tr>`;
          cells.forEach(c => {
            tableHtml += `<td style="border:1px solid #000;padding:6px;">${c}</td>`;
          });
          tableHtml += `</tr>`;
        }
      });
      tableHtml += `</tbody></table>`;

      result.push(tableHtml);
      idx = j;
    } else {
      let cleanText = lines[idx].replace(/^\||\|$/g, "").trim();
      if (cleanText) {
        result.push(`<p>${cleanText}</p>`);
      }
      idx++;
    }
  }

  return result.join("\n");
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
    ADD_ATTR: ["class", "border", "cellpadding", "cellspacing", "style", "data-border"]
  });
}
