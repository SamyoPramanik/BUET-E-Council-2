// Run with:  node --test meeting_service/utils/pageLayout.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizePageLayout, toPdfLayout } = require('./pageLayout');

test('keeps a valid layout and drops unknown fields', () => {
    const out = sanitizePageLayout({ size: 'Legal', orientation: 'landscape', margins: { top: 10, right: 12.7, bottom: 10, left: 12.7 }, marginPreset: 'narrow', junk: 1 });
    assert.deepEqual(out, { size: 'Legal', orientation: 'landscape', margins: { top: 10, right: 12.7, bottom: 10, left: 12.7 }, marginPreset: 'narrow' });
});

test('size is matched case-insensitively; unknown size or non-object is rejected', () => {
    assert.equal(sanitizePageLayout({ size: 'legal' }).size, 'Legal');
    assert.equal(sanitizePageLayout({ size: 'Poster' }), null);
    assert.equal(sanitizePageLayout(null), null);
    assert.equal(sanitizePageLayout('A4'), null);
});

test('margins are clamped to 0-60mm, bad values fall back to 25.4', () => {
    const m = sanitizePageLayout({ size: 'A4', margins: { top: -5, right: 900, bottom: 'x', left: 20 } }).margins;
    assert.deepEqual(m, { top: 0, right: 60, bottom: 25.4, left: 20 });
});

test('orientation defaults to portrait; unknown preset becomes custom', () => {
    const out = sanitizePageLayout({ size: 'A4', orientation: 'sideways', marginPreset: 'weird' });
    assert.equal(out.orientation, 'portrait');
    assert.equal(out.marginPreset, 'custom');
});

test('toPdfLayout maps to the shape normalizePdfLayout takes', () => {
    assert.deepEqual(
        toPdfLayout({ size: 'Legal', orientation: 'portrait', margins: { top: 20, right: 20, bottom: 20, left: 20 } }),
        { pageSize: 'Legal', orientation: 'portrait', margin: { top: 20, right: 20, bottom: 20, left: 20 } }
    );
    assert.equal(toPdfLayout(null), undefined);
});
