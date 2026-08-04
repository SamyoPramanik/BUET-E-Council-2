const { parseAgendumBody } = require('../meeting_service/utils/agendaSerial');

const testCases = [
    {
        name: 'Proposal with prefix "এ" and serial 210324',
        body: 'প্রস্তাব নং এ ২১০৩২৪ : পুরকৌশল বিভাগের স্নাতকোত্তর শ্রেণীর ছাত্র...',
        expectedSerial: 210324,
        expectedPrefix: 'এ'
    },
    {
        name: 'Proposal with prefix "সি" and serial 1401005',
        body: 'প্রস্তাব নং সি ১৪০১০০৫ : পুরকৌশল বিভাগের...',
        expectedSerial: 1401005,
        expectedPrefix: 'সি'
    },
    {
        name: 'Proposal with wildcard asterisk',
        body: 'প্রস্তাব নং * ২১০৩২৪ : পুরকৌশল বিভাগের...',
        expectedSerial: 210324,
        expectedPrefix: ''
    },
    {
        name: 'Bibidha marker',
        body: 'বিবিধ : অন্যান্য বিষয় সংক্রান্ত আলোচনা...',
        expectedSerial: 0,
        expectedPrefix: null
    }
];

console.log('--- TESTING PARSE AGENDUM BODY WITH PREFIXES ---');
for (const tc of testCases) {
    const res = parseAgendumBody(tc.body, 10);
    console.log(`[TEST] ${tc.name}:`);
    console.log(`  Input Body: "${tc.body.slice(0, 45)}..."`);
    console.log(`  Extracted Serial: ${res.serial} (Expected: ${tc.expectedSerial})`);
    console.log(`  Extracted Prefix: "${res.prefix}" (Expected: "${tc.expectedPrefix}")`);
    console.log(`  isBibidha: ${res.isBibidha}`);
    if (res.serial !== tc.expectedSerial) {
        console.error(`  FAIL: Expected serial ${tc.expectedSerial} but got ${res.serial}`);
        process.exit(1);
    }
}
console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
