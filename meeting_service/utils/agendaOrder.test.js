// Run with:  node --test meeting_service/utils/agendaOrder.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeAgendaOrder } = require('./agendaOrder');

const rows = [
    { id: 'a', content: '<p>one</p>' },
    { id: 'b', content: '<p>two</p>' },
    { id: 'c', content: '<p>three</p>' },
    { id: 'bib', content: '<p>বিবিধ :</p>' },
];

test('uses the submitted order', () => {
    assert.deepEqual(computeAgendaOrder(rows, ['c', 'a', 'b', 'bib'], false).ids, ['c', 'a', 'b', 'bib']);
});

test('বিবিধ is forced last on the main agenda, wherever the client put it', () => {
    assert.deepEqual(computeAgendaOrder(rows, ['bib', 'c', 'a', 'b'], false).ids, ['c', 'a', 'b', 'bib']);
    assert.deepEqual(computeAgendaOrder(rows, ['c', 'bib', 'a', 'b'], false).ids, ['c', 'a', 'b', 'bib']);
});

test('supplementary agendas are not given a বিবিধ rule', () => {
    const sup = [{ id: 'x', content: 'বিবিধ' }, { id: 'y', content: 'y' }];
    assert.deepEqual(computeAgendaOrder(sup, ['x', 'y'], true).ids, ['x', 'y']);
});

test('agendas the client did not mention keep their order, after the submitted ones', () => {
    assert.deepEqual(computeAgendaOrder(rows, ['c', 'a'], false).ids, ['c', 'a', 'b', 'bib']);
});

test('duplicate ids are ignored', () => {
    assert.deepEqual(computeAgendaOrder(rows, ['b', 'b', 'a', 'c'], false).ids, ['b', 'a', 'c', 'bib']);
});

test('an unknown id (another meeting, archived, deleted) is rejected', () => {
    assert.ok(computeAgendaOrder(rows, ['a', 'zzz'], false).error);
});

test('bad input is rejected', () => {
    assert.ok(computeAgendaOrder(null, ['a'], false).error);
    assert.ok(computeAgendaOrder(rows, 'a', false).error);
});
