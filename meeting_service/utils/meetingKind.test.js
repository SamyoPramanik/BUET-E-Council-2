// Run with:  node --test meeting_service/utils/meetingKind.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isImmediateHeading, resolveIsRegular } = require('./meetingKind');

test('a heading containing "immediate" (any case) is immediate', () => {
    assert.equal(isImmediateHeading('৪৬১তম জরুরী (Immediate) সভা'), true);
    assert.equal(isImmediateHeading('IMMEDIATE meeting'), true);
    assert.equal(isImmediateHeading('৪৬০তম সভা'), false);
    assert.equal(isImmediateHeading(undefined, null, ''), false);
});

test('any of several headings can mark it immediate', () => {
    assert.equal(isImmediateHeading('461', 'Immediate Syndicate'), true);
});

test('resolveIsRegular: explicit boolean wins, otherwise from heading', () => {
    assert.equal(resolveIsRegular(true, 'Immediate'), true);
    assert.equal(resolveIsRegular(false, 'Regular'), false);
    assert.equal(resolveIsRegular(undefined, 'Immediate'), false);
    assert.equal(resolveIsRegular(undefined, 'Regular meeting'), true);
});
