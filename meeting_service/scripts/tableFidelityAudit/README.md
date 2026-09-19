# Table fidelity audit

Checks that a table prints in the PDF the way the editor draws it. Dev tooling only:
it is not part of the running service and needs no database.

## Layout audit (`audit.js`)

```
node meeting_service/scripts/tableFidelityAudit/audit.js [--shots <dir>] [--case <text>]
```

Each case in `cases.js` (every border style, the Table Style gallery, alignment,
width modes, partial / full / merged column widths, header rows, cell shading,
vertical alignment, row heights, vertical text, formatting, lists, long words,
spaces) is rendered twice in Chromium at the same width:

* **editor**: the editor's real CSS, compiled from `frontend/app/globals.css` with
  the project's own Tailwind setup (so Tailwind Typography's `prose-sm` table rules
  are included), plus ProseMirror's base styles;
* **pdf**: the PDF generator's real HTML processing (`styleRichTextHtml`) and the
  table rules read straight from `pdfGenerator.js`.

Table size and margins, and every cell's box, colours, font size, line height,
alignment, padding, borders and line count are compared. Exit code 1 if a real
difference remains. `EXPECTED` in `audit.js` lists the differences that are on
purpose (the editor's dashed guide lines, mirrored borders on vertical-text cells,
a table wider than the page shrinking to fit on paper). `--shots` saves a
screenshot of both sides for each case.

## Page breaks (`pages.js`)

```
node meeting_service/scripts/tableFidelityAudit/pages.js [--out <dir>]
```

Renders a document of tables that cross page breaks (long table, very tall cell,
tables back to back, a rowspan crossing the break, dashed/thick borders) through
the real PDF renderer and writes the PDF and a PNG per page (needs `pdftoppm`).
This one is checked by eye.

## Requirements

* Chromium: `PUPPETEER_EXECUTABLE_PATH` (default `/usr/bin/chromium`)
* `npm install` done in both `meeting_service/` and `frontend/`

## Adding a case

Add it to `cases.js`. `table()` builds the HTML the editor's `getHTML()` emits, so
what is audited is what the PDF generator really receives.
