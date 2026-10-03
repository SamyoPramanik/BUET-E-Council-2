// The page setup chosen in the editor's Page Layout tab (size, orientation,
// margins) is stored on the meeting (`meetings.page_layout`, JSONB) so the PDF
// can print on exactly the page the author was writing on.

const PAGE_SIZES = ['A4', 'Letter', 'Legal', 'A3', 'A5', 'Tabloid'];
// Bangla-capable fonts a meeting can use as its document font (labels, headings,
// serials and any text with no font of its own). null = the default SonarBangla.
const DOC_FONTS = ['Nikosh', 'NikoshBAN', 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali'];
const MARGIN_PRESETS = ['normal', 'narrow', 'moderate', 'wide', 'custom'];

const cleanDocFont = (value) => DOC_FONTS.find((f) => f.toLowerCase() === String(value || '').trim().toLowerCase()) || null;

const clampMm = (value, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(60, Math.max(0, Math.round(n * 100) / 100));
};

// Validate whatever the client sent; unknown fields are dropped. Returns null
// when there is nothing usable, so callers can clear the saved layout.
const sanitizePageLayout = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const size = PAGE_SIZES.find((s) => s.toLowerCase() === String(raw.size || '').toLowerCase());
    if (!size) return null;
    const m = raw.margins && typeof raw.margins === 'object' ? raw.margins : {};
    return {
        size,
        orientation: String(raw.orientation || '').toLowerCase() === 'landscape' ? 'landscape' : 'portrait',
        margins: {
            top: clampMm(m.top, 25.4),
            right: clampMm(m.right, 25.4),
            bottom: clampMm(m.bottom, 25.4),
            left: clampMm(m.left, 25.4),
        },
        marginPreset: MARGIN_PRESETS.includes(raw.marginPreset) ? raw.marginPreset : 'custom',
        docFont: cleanDocFont(raw.docFont),
    };
};

// Shape pdfGenerator.normalizePdfLayout() takes.
const toPdfLayout = (saved) => {
    const layout = sanitizePageLayout(saved);
    if (!layout) return undefined;
    return { pageSize: layout.size, orientation: layout.orientation, margin: { ...layout.margins }, docFont: layout.docFont };
};

module.exports = { sanitizePageLayout, toPdfLayout, cleanDocFont, PAGE_SIZES, DOC_FONTS };
