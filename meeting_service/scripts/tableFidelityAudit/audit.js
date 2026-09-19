#!/usr/bin/env node
// Table fidelity audit: does the PDF draw a table the way the editor does?
//
// Every case in cases.js is rendered twice in Chromium at the same page width:
//   editor - the editor's real compiled CSS (frontend/app/globals.css incl.
//            Tailwind prose-sm) + ProseMirror's base styles
//   pdf    - the PDF generator's real HTML processing and table stylesheet
// and layout + computed styles are compared cell by cell.
//
//   node meeting_service/scripts/tableFidelityAudit/audit.js [--shots <dir>] [--case <text>]
//
// Needs Chromium (PUPPETEER_EXECUTABLE_PATH, default /usr/bin/chromium) and the
// frontend's node_modules. No database. Exit code 1 if a real difference remains.
const fs = require('fs');
const path = require('path');
const { pdfGenerator, pdfTableCss, compileEditorCss, launchBrowser } = require('./lib');
const { cases } = require('./cases');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const shotsDir = opt('--shots');
const only = opt('--case');
const WIDTH = 642; // A4 with 20 mm margins, in CSS px

const editorPage = (css, tableHtml) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}
.ProseMirror{position:relative;word-wrap:break-word;white-space:pre-wrap;white-space:break-spaces;font-variant-ligatures:none}
body{margin:0;font-family:Arial,sans-serif;background:#fff}</style></head><body>
<div class="tiptap ProseMirror prose prose-sm max-w-none" style="width:${WIDTH}px;font-family:Arial,sans-serif"><div class="tableWrapper">${tableHtml}</div></div></body></html>`;

const pdfPage = (tableHtml) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;font-size:14px;line-height:1.5;margin:0;padding:0;width:${WIDTH}px;background:#fff}
${pdfTableCss()}</style></head><body><div class="agenda-content" style="text-align:left;font-size:14px;line-height:1.6">${pdfGenerator.styleRichTextHtml(tableHtml, false)}</div></body></html>`;

// Runs in the page: geometry and computed style of the table and every cell.
const measure = () => {
    const cs = (el) => getComputedStyle(el);
    const table = document.querySelector('table');
    const tr = table.getBoundingClientRect();
    const border = (s, side) => [s[`border${side}Width`], s[`border${side}Style`], s[`border${side}Color`]].join(' ');
    const ts = cs(table);
    const out = { table: { w: Math.round(tr.width), mt: ts.marginTop, mb: ts.marginBottom, left: Math.round(tr.left) }, cells: [] };
    document.querySelectorAll('td,th').forEach((c) => {
        const r = c.getBoundingClientRect();
        const s = cs(c);
        const p = c.querySelector('p,li') || c;
        const ps = cs(p);
        const range = document.createRange();
        range.selectNodeContents(c);
        const lines = new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size;
        out.cells.push({
            x: Math.round(r.left - tr.left), y: Math.round(r.top - tr.top), w: Math.round(r.width), h: Math.round(r.height),
            bg: s.backgroundColor, color: s.color, fw: s.fontWeight, fs: ps.fontSize, lh: ps.lineHeight,
            ta: ps.textAlign.replace('start', 'left'), va: s.verticalAlign,
            pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].join(' '),
            bR: border(s, 'Right'), bB: border(s, 'Bottom'), ws: ps.whiteSpace, lines,
        });
    });
    return out;
};

// color(srgb ...) -> rgb(), and "no border" spelled one way.
const rgb = (c) => {
    const m = String(c).match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)/);
    return m ? `rgb(${m.slice(1, 4).map((x) => Math.round(parseFloat(x) * 255)).join(', ')})` : String(c);
};
const edge = (s) => { const [w, st] = rgb(s).split(' '); return parseFloat(w) === 0 || st === 'none' ? 'none' : rgb(s); };

// Differences that are expected and are not bugs. Each gets the case name, the
// kind of difference ('width', 'border', 'x', ...) and the editor's value.
const EXPECTED = [
    // The editor draws faint dashed guide lines on outer / none borders as editing
    // aids (they add a pixel or two to every row); they are not printed.
    (name, kind, e) => /^border: (outer|none)$/.test(name) && (kind === 'border' ? /dashed rgba\(203, 213, 225/.test(String(e)) : ['h', 'y'].includes(kind)),
    // Vertical-text cells: the PDF puts the mirrored borders on the left/top (see pdfGenerator.js).
    (name, kind) => /^vertical text/.test(name) && kind === 'border',
    // A table wider than the page scrolls in the editor and shrinks to fit on paper.
    (name, kind) => /^wider than the page/.test(name) && ['width', 'w', 'x'].includes(kind),
];

function diff(name, E, P) {
    const out = [];
    const add = (kind, label, e, p) => { if (!EXPECTED.some((fn) => fn(name, kind, e))) out.push(`${label}: editor=${e} | pdf=${p}`); };
    if (Math.abs(E.table.w - P.table.w) > 1) add('width', 'table width', E.table.w, P.table.w);
    if (E.table.mt !== P.table.mt) add('margin', 'table margin', E.table.mt, P.table.mt);
    if (Math.abs(E.table.left - P.table.left) > 1) add('left', 'table left', E.table.left, P.table.left);
    E.cells.forEach((e, i) => {
        const p = P.cells[i];
        if (!p) return add('cells', `cell ${i}`, 'present', 'missing');
        for (const k of ['w', 'h', 'x', 'y']) if (Math.abs(e[k] - p[k]) > 1) add(k, `cell ${i} ${k}`, e[k], p[k]);
        for (const k of ['color', 'bg']) if (rgb(e[k]) !== rgb(p[k])) add(k, `cell ${i} ${k}`, rgb(e[k]), rgb(p[k]));
        for (const k of ['fw', 'fs', 'lh', 'va', 'pad', 'ws', 'ta', 'lines']) if (String(e[k]) !== String(p[k])) add(k, `cell ${i} ${k}`, e[k], p[k]);
        for (const [k, side] of [['bR', 'right'], ['bB', 'bottom']]) if (edge(e[k]) !== edge(p[k])) add('border', `cell ${i} border-${side}`, edge(e[k]), edge(p[k]));
    });
    return out;
}

(async () => {
    const css = await compileEditorCss();
    const browser = await launchBrowser();
    if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
    let failed = 0;
    let n = 0;
    for (const [name, html] of Object.entries(cases)) {
        if (only && !name.includes(only)) continue;
        n++;
        const res = {};
        for (const [side, page] of [['editor', editorPage(css, html)], ['pdf', pdfPage(html)]]) {
            const tab = await browser.newPage();
            await tab.setViewport({ width: WIDTH + 60, height: 500 });
            await tab.setContent(page, { waitUntil: 'load' });
            res[side] = await tab.evaluate(measure);
            if (shotsDir) await tab.screenshot({ path: path.join(shotsDir, `${String(n).padStart(2, '0')}-${side}.png`), fullPage: true });
            await tab.close();
        }
        const d = diff(name, res.editor, res.pdf);
        if (d.length) failed++;
        console.log(`${d.length ? 'DIFF ' : 'ok   '} ${name}${d.length ? ` (${d.length})` : ''}`);
        d.slice(0, 8).forEach((x) => console.log(`       ${x}`));
    }
    await browser.close();
    console.log(`\n${n - failed} of ${n} cases match the editor${shotsDir ? `; screenshots in ${shotsDir}` : ''}`);
    process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
