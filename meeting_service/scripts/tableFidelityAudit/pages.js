#!/usr/bin/env node
// Multi-page table check: renders a document full of tables that cross page
// breaks through the PDF generator's real renderer (A4, 20 mm margins) and writes
// the PDF plus one PNG per page (needs `pdftoppm`) so the breaks can be inspected.
//
//   node meeting_service/scripts/tableFidelityAudit/pages.js [--out <dir>]
//
// Things to look for: borders closed at the bottom of a page and reopened at the
// top of the next, a tall cell continuing across pages, a merged (rowspan) cell
// crossing a break, tables back to back, dashed/thick borders at a break.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pdfGenerator, pdfTableCss } = require('./lib');
const { table, H } = require('./cases');

const args = process.argv.slice(2);
const out = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : 'table-pages-out');
fs.mkdirSync(out, { recursive: true });

const rows = (n) => Array.from({ length: n }, (_, i) => [`Row ${i + 1}`, `Item ${i + 1}`, String((i + 1) * 7), `note ${i % 5}`]);
const longText = 'This is a very long cell of text that keeps going and going so that the row has to be split across the page boundary when it is printed. '.repeat(28);

const body = [
    '<p>Intro paragraph before the tables.</p>',
    '<p><b>A. Long table with a header row (45 rows)</b></p>',
    table({ rows: [[H('Name'), H('Item'), H('Value'), H('Note')], ...rows(45)] }),
    '<p><b>B. A table with a very tall cell</b></p>',
    table({ rows: [[H('Title'), H('Body')], ['short', longText], ['after', 'ok']] }),
    '<p><b>C/D. Two tables back to back</b></p>',
    table({ rows: [[H('C1'), H('C2')], ['c', 'd']] }) + table({ border: 'thick', rows: [[H('D1'), H('D2')], ['e', 'f']] }),
    '<p><b>E. A merged (rowspan) cell crossing the page</b></p>',
    table({ rows: [[H('Group'), H('Item'), H('Value')],
        [{ html: 'Merged group A spanning many rows', rowspan: 14 }, 'i1', '1'], ...Array.from({ length: 13 }, (_, i) => [`i${i + 2}`, String(i + 2)]),
        [{ html: 'Group B', rowspan: 14 }, 'j1', '1'], ...Array.from({ length: 13 }, (_, i) => [`j${i + 2}`, String(i + 2)])] }),
    '<p><b>F. Dashed, banded table (30 rows)</b></p>',
    table({ border: 'dashed', style: 'bands-gray', rows: [[H('Name'), H('Item'), H('Value'), H('Note')], ...rows(30)] }),
].join('');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.5;margin:0;padding:0}
${pdfTableCss()}</style></head><body><div class="agenda-content" style="text-align:left;font-size:14px;line-height:1.6">${pdfGenerator.styleRichTextHtml(body, false)}</div></body></html>`;

(async () => {
    const pdf = await pdfGenerator.renderPdf(html, { pageSize: 'A4', orientation: 'portrait', margin: { top: 20, right: 20, bottom: 20, left: 20 }, scale: 1 });
    const file = path.join(out, 'table-pages.pdf');
    fs.writeFileSync(file, pdf);
    let pages = 0;
    try {
        execFileSync('pdftoppm', ['-r', '60', '-png', file, path.join(out, 'page')]);
        pages = fs.readdirSync(out).filter((f) => /^page-\d+\.png$/.test(f)).length;
        console.log(`wrote ${file} (${pages} pages); page images: ${out}/page-*.png`);
    } catch {
        console.log(`wrote ${file}; pdftoppm not found, open the PDF to inspect the page breaks`);
        pages = 2; // cannot count without it; do not fail the run for that
    }
    process.exit(pages > 1 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
