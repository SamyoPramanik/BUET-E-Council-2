// Run with:  node --test frontend/lib/bijoyToUnicode.test.ts
//
// Sample strings are taken from a real SutonnyMJ Word document of BUET council
// agenda text, covering the sequences the bijoy2unicode package gets wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { convertBijoyToUnicode } from './bijoyToUnicode.ts';

const cases: [string, string, string][] = [
  ['reph after ী', 'wkÿv_x© RyjvB 2025', 'শিক্ষার্থী জুলাই 2025'],
  ['reph before ী is unchanged', 'wkÿv_©xMY', 'শিক্ষার্থীগণ'],
  ['reph after ৃ', 'KZ…©K M„nxZ', 'কর্তৃক গৃহীত'],
  ['reph after conjunct suffix', 'cv‡k¦© DwjøwLZ', 'পার্শ্বে উল্লিখিত'],
  ['doubled reph', 'Uvg©© ‡kl', 'টার্ম শেষ'],
  ['plain text still converts', 'GgZve¯’vq, DcvPvh© g‡nv`q', 'এমতাবস্থায়, উপাচার্য মহোদয়'],
  ['embedded English word', '3| wefvMxq cÖavb g‡nv`‡qi gZvgZ t Forwarded.', '3। বিভাগীয় প্রধান মহোদয়ের মতামত : Forwarded.'],
  ['embedded English phrase', '†Kvm© Add/Drop Kivi', 'কোর্স Add/Drop করার'],
  ['English word with Bijoy suffix', 'Thesis-G 1.5 †µwWU', 'Thesis-এ 1.5 ক্রেডিট'],
  ['English words in a sentence', 'Zvi welqwU special case wn‡m‡e', 'তার বিষয়টি special case হিসেবে'],
  ['acronym', 'BUET Gi wefvM', 'BUET এর বিভাগ'],
  ['vowel-rich Bijoy word is not English', 'Kivi', 'করার'],
];

for (const [name, input, expected] of cases) {
  test(name, () => assert.equal(convertBijoyToUnicode(input).normalize('NFC'), expected.normalize('NFC')));
}

test('keepEnglish:false converts everything as Bijoy', () => {
  assert.notEqual(convertBijoyToUnicode('Forwarded', { keepEnglish: false }), 'Forwarded');
});

test('common council English words and abbreviations are kept', () => {
  for (const w of ['term', 'semester', 'credit', 'faculty', 'Withdraw', 'Dept.', 'Dr.', 'Sl. No.', 'ME', 'Spring']) {
    assert.equal(convertBijoyToUnicode(w), w);
  }
  // Without the full stop these are ordinary Bijoy words, not abbreviations.
  assert.notEqual(convertBijoyToUnicode('me'), 'me');
});

test('English digits are kept as typed', () => {
  assert.equal(convertBijoyToUnicode('2106007'), '2106007');
  assert.equal(convertBijoyToUnicode('Stn. 2106007'), 'Stn. 2106007');
  assert.equal(convertBijoyToUnicode('CSE-2106007'), 'CSE-2106007');
  assert.equal(convertBijoyToUnicode('17-07-2026 8.5 †µwWU'), '17-07-2026 8.5 ক্রেডিট');
  assert.equal(convertBijoyToUnicode('1| 5wU †Kvm©').normalize('NFC'), '1। 5টি কোর্স'.normalize('NFC'));
});

test('officer titles and acronyms are kept', () => {
  for (const w of ['Register', 'VC', 'Pro-VC', 'DVC', 'Proctor', 'Provost']) {
    assert.equal(convertBijoyToUnicode(w), w);
  }
  assert.equal(convertBijoyToUnicode('VC Gi'), 'VC এর');
});

test('department, faculty and office names from the seed data are kept', () => {
  const names = [
    'Faculty of Chemical and Materials Engineering', 'Faculty of Post Graduate Studies',
    'Department of Naval Arch. & Marine Engineering (NAME)', 'Department of Bio-Medical Engineering (BME)',
    'Pro-Vice Chancellor', 'Ministry of Education', 'Department of Physics (Phy)',
    'Department of Chemical Engineering (ChE)', 'Faculty of Civil Engineering',
  ];
  for (const n of names) assert.equal(convertBijoyToUnicode(n), n);
});

test('a lone "t" is a colon, but a visarga inside a word stays', () => {
  assert.equal(convertBijoyToUnicode('gZvgZ t Forwarded.').normalize('NFC'), 'মতামত : Forwarded.'.normalize('NFC'));
  assert.equal(convertBijoyToUnicode('gZvgZ t').normalize('NFC'), 'মতামত :'.normalize('NFC'));
  assert.ok(convertBijoyToUnicode('g~jZt').endsWith('ঃ'));
});
