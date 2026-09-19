// Table cases for the fidelity audit. Each builds the HTML the editor's getHTML()
// emits for a table (TipTap Table + CustomTable/Cell attributes), which is both
// what the editor renders and what the PDF generator is given.

const H = (html) => ({ th: true, html });

// rows: array of rows; a cell is a string (paragraph text) or
// { html, th, colspan, rowspan, style, dir (vertical text), raw (html as-is), col }.
function table({ border = 'full', style = 'none', align = 'left', mode = 'full', cols, rows }) {
    const widths = cols || [];
    const allSized = widths.length > 0 && widths.every(Boolean);
    const sum = widths.reduce((a, w) => a + (w || 25), 0);
    const colgroup = widths.length
        ? `<colgroup>${widths.map((w) => (w ? `<col style="width: ${w}px">` : '<col style="min-width: 25px">')).join('')}</colgroup>`
        : '';
    // TipTap writes width when every column is sized, min-width otherwise.
    const inline = widths.length ? ` style="${allSized ? 'width' : 'min-width'}: ${sum}px"` : '';
    const cls = `meeting-table border-${border} table-style-${style} table-align-${align} table-width-${mode}`;
    const trs = rows.map((row) => '<tr>' + row.map((raw, ci) => {
        const c = typeof raw === 'string' ? { html: raw } : raw;
        const attrs = [];
        if (c.colspan > 1) attrs.push(`colspan="${c.colspan}"`);
        if (c.rowspan > 1) attrs.push(`rowspan="${c.rowspan}"`);
        const col = c.col ?? ci;
        const span = c.colspan > 1 ? c.colspan : 1;
        const ws = widths.slice(col, col + span); // a merged cell carries every width it covers
        if (ws.length === span && ws.every(Boolean)) attrs.push(`colwidth="${ws.join(',')}"`);
        let st = c.style || '';
        if (c.dir) {
            st = `writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; vertical-align: middle; ${st}`;
            attrs.push('data-text-direction="vertical-rl"');
        } else {
            attrs.push('data-text-direction="horizontal"');
        }
        if (st) attrs.push(`style="${st}"`);
        const tag = c.th ? 'th' : 'td';
        return `<${tag} ${attrs.join(' ')}>${c.raw ? c.html : `<p>${c.html}</p>`}</${tag}>`;
    }).join('') + '</tr>').join('');
    return `<table class="${cls}" data-border="${border}" data-table-style="${style}" data-align="${align}" data-width-mode="${mode}"${inline}>${colgroup}<tbody>${trs}</tbody></table>`;
}

const grid = (extra = {}) => table({
    ...extra,
    rows: [[H('Name'), H('Marks'), H('Grade')], ['Rahim', '85', 'A+'], ['Karim', '72', 'A'], ['Salma', '64', 'B'], ['Nasrin', '55', 'C']],
});

const cases = {};
cases['basic grid with header row'] = grid();
for (const b of ['outer', 'header', 'dashed', 'thick', 'none']) cases[`border: ${b}`] = grid({ border: b });
for (const s of ['grid-blue', 'bands-gray', 'crimson-header']) cases[`table style: ${s}`] = grid({ style: s });
cases['no header row (all td)'] = table({ rows: [['a', 'b', 'c'], ['d', 'e', 'f']] });
cases['align center, auto width, all colwidths'] = grid({ align: 'center', mode: 'auto', cols: [120, 80, 60] });
cases['align right, auto width'] = grid({ align: 'right', mode: 'auto', cols: [150, 90, 70] });
cases['full width, all colwidths'] = grid({ cols: [300, 150, 100] });
cases['full width, one narrow column'] = table({ cols: [24, null, null], rows: [[H('Sl'), H('Name'), H('Remark')], ['hello world', 'A long name that needs wrapping in the cell', 'ok']] });
cases['merged cells (colspan/rowspan)'] = table({ cols: [100, 100, 100], rows: [[{ th: true, html: 'Merged header', colspan: 3 }], [{ html: 'rowspan 2', rowspan: 2 }, 'b', 'c'], ['d', 'e'], ['f', 'g', 'h']] });
cases['cell shading, vertical align, heights'] = table({ rows: [[H('A'), H('B'), H('C')], [{ html: 'top', style: 'height: 80px; vertical-align: top; background-color: #fef08a' }, { html: 'middle', style: 'height: 80px; vertical-align: middle; background-color: #bbf7d0' }, { html: 'bottom', style: 'height: 80px; vertical-align: bottom; background-color: #bfdbfe' }]] });
for (const b of ['full', 'thick', 'dashed']) cases[`vertical text, border ${b}`] = table({ border: b, rows: [[H('Label'), H('Value')], [{ html: 'Vertical', dir: true }, 'Horizontal']] });
cases['formatting, alignment, lists in cells'] = table({ rows: [[H('Formatting'), H('Alignment')], [{ raw: true, html: '<p><strong>bold</strong> <em>italic</em> <u>under</u> <s>strike</s> <span style="font-size: 20px">big</span> <span style="color: #dc2626">red</span> <a href="https://x.y">link</a></p>' }, { raw: true, html: '<p style="text-align: right">right</p><p style="text-align: center">center</p><p style="text-align: justify">justify justify justify justify justify justify justify</p>' }], [{ raw: true, html: '<ul><li><p>one</p></li><li><p>two</p></li></ul>' }, { raw: true, html: '<ol><li><p>first</p></li><li><p>second</p></li></ol>' }]] });
cases['paragraph line spacing in a cell'] = table({ cols: [160], rows: [[H('Spacing')], [{ raw: true, html: '<p style="line-height: 2">double spaced text that wraps onto several lines inside a narrow cell to show spacing</p>' }]] });
cases['long words in narrow columns'] = table({ cols: [40, 60, null], rows: [[H('A'), H('B'), H('C')], ['Supercalifragilistic', 'Extraordinarily', 'normal text here']] });
cases['double and trailing spaces'] = table({ cols: [80, null], rows: [[H('A'), H('B')], ['a  b   c ', 'x']] });
cases['wider than the page (colwidths sum 900)'] = grid({ cols: [400, 300, 200] });
cases['auto width, partial widths'] = grid({ mode: 'auto', cols: [120, null, null] });

module.exports = { table, H, grid, cases };
