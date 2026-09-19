// Puts a bold serial prefix ("১:") at the start of an agenda body.
//
// The prefix goes into the body's first paragraph so it reads as the start of
// that line. Only a paragraph that comes *before* any table counts: editor
// tables wrap every cell's text in <p>, so a body that opens with a table would
// otherwise get the serial injected into the table's first cell. In that case
// the prefix gets a paragraph of its own above the table.
const injectInlinePrefix = (rawHtml, prefix) => {
    if (!prefix) return rawHtml;
    const bold = `<b>${prefix}</b> `;
    const para = rawHtml.match(/<p\b[^>]*>/i);
    const table = rawHtml.match(/<table\b/i);
    if (para && (!table || para.index < table.index)) {
        const at = para.index + para[0].length;
        return rawHtml.slice(0, at) + bold + rawHtml.slice(at);
    }
    if (table && table.index === rawHtml.search(/\S/)) {
        return `<p>${bold.trim()}</p>` + rawHtml;
    }
    return bold + rawHtml;
};

module.exports = { injectInlinePrefix };
