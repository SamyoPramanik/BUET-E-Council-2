// Run with:  node --test meeting_service/utils/inlinePrefix.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectInlinePrefix } = require('./inlinePrefix');

test('goes at the start of the first paragraph', () => {
    assert.equal(injectInlinePrefix('<p>text</p>', '১:'), '<p><b>১:</b> text</p>');
});

test('no prefix leaves the body alone', () => {
    assert.equal(injectInlinePrefix('<p>text</p>', ''), '<p>text</p>');
});

test('plain text without a paragraph', () => {
    assert.equal(injectInlinePrefix('text', '১:'), '<b>১:</b> text');
});

test('a body that opens with a table gets the prefix above it, not inside a cell', () => {
    const table = '<table><tbody><tr><td><p>cell</p></td></tr></tbody></table>';
    const out = injectInlinePrefix(table + '<p>after</p>', '১:');
    assert.equal(out, '<p><b>১:</b></p>' + table + '<p>after</p>');
    assert.ok(!/<td><p><b>/.test(out));
});

test('a paragraph before the table still takes the prefix', () => {
    const html = '<p>intro</p><table><tr><td><p>c</p></td></tr></table>';
    assert.equal(injectInlinePrefix(html, '১:'), '<p><b>১:</b> intro</p><table><tr><td><p>c</p></td></tr></table>');
});
