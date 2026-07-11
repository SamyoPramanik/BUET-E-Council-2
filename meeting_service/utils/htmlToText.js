// Minimal HTML -> plain text conversion for TipTap-authored rich text.
// Good enough for search indexing (full-text + embeddings), not a general
// purpose renderer.
const htmlToText = (html) => {
    if (!html) return '';
    return html
        .replace(/<(p|div|br|li|h[1-6])[^>]*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{2,}/g, '\n\n')
        .trim();
};

module.exports = { htmlToText };
