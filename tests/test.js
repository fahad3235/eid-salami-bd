/* eid-salami-bd - node unit tests. Run: node tests/test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const DATA = require('../js/data.js');
const L = require('../js/logic.js');

const TODAY = '2026-11-19';
const S = DATA.SAMPLE; // Received 25,500 (6) / Given 4,500 (4) / Net 21,000 / Biggest 10,000 / Avg 3,000
const TAKA = '\u09f3';
const GOOD = { name: 'Amma', relation: 'family', direction: 'received', amount: 5000, eid: 'fitr', year: 2026, date: '2026-11-10', note: '' };

test('data: 10 samples, i18n en/bn keys match, months 12, constants', () => {
  assert.equal(S.length, 10);
  assert.equal(new Set(S.map((e) => e.id)).size, 10);
  const en = Object.keys(DATA.I18N.en).sort();
  assert.deepEqual(Object.keys(DATA.I18N.bn).sort(), en);
  for (const k of en) {
    const a = DATA.I18N.en[k], b = DATA.I18N.bn[k];
    assert.ok((Array.isArray(a) ? a.length === 12 : String(a).length > 0), k);
    assert.ok((Array.isArray(b) ? b.length === 12 : String(b).length > 0), k);
  }
  assert.equal(DATA.MAX_AMOUNT, 100000);
  assert.equal(DATA.MIN_YEAR, 2000);
  assert.equal(DATA.MAX_YEAR, 2100);
  assert.deepEqual(DATA.RELATIONS, ['family', 'friend', 'neighbour', 'colleague', 'child', 'elder', 'other']);
  assert.deepEqual(DATA.EIDS, ['fitr', 'adha']);
  assert.deepEqual(DATA.DIRECTIONS, ['received', 'given']);
});

test('isValidDateStr: leap day, bad month/day, wrong shape', () => {
  assert.equal(L.isValidDateStr('2024-02-29'), true);
  assert.equal(L.isValidDateStr('2026-02-29'), false);
  assert.equal(L.isValidDateStr('2026-13-01'), false);
  assert.equal(L.isValidDateStr('2026-04-31'), false);
  assert.equal(L.isValidDateStr('2026-11-19'), true);
  assert.equal(L.isValidDateStr('19-11-2026'), false);
  assert.equal(L.isValidDateStr('2026-11-9'), false);
});

test('validateRecord: accepts good; trims name/note; string amount/year coerced', () => {
  const v = L.validateRecord({ ...GOOD, name: '  Amma  ', amount: '5000', year: '2026', note: '  hi  ' }, TODAY);
  assert.equal(v.ok, true);
  assert.equal(v.record.name, 'Amma');
  assert.equal(v.record.note, 'hi');
  assert.equal(v.record.amount, 5000);
  assert.equal(v.record.year, 2026);
  assert.equal(L.validateRecord({ ...GOOD, amount: 1 }, TODAY).ok, true);
  assert.equal(L.validateRecord({ ...GOOD, amount: 100000 }, TODAY).ok, true);
  assert.equal(L.validateRecord({ ...GOOD, year: 2000 }, TODAY).ok, true);
  assert.equal(L.validateRecord({ ...GOOD, year: 2100 }, TODAY).ok, true);
});

test('validateRecord: rejects bad name, relation, direction, amount, eid, year, date, note', () => {
  assert.equal(L.validateRecord({ ...GOOD, name: '' }, TODAY).errors.name, 'name');
  assert.equal(L.validateRecord({ ...GOOD, name: '   ' }, TODAY).errors.name, 'name');
  assert.equal(L.validateRecord({ ...GOOD, name: 'x'.repeat(61) }, TODAY).errors.name, 'name');
  assert.equal(L.validateRecord({ ...GOOD, name: 'x'.repeat(60) }, TODAY).ok, true);
  assert.equal(L.validateRecord({ ...GOOD, relation: 'boss' }, TODAY).errors.relation, 'relation');
  assert.equal(L.validateRecord({ ...GOOD, direction: 'lent' }, TODAY).errors.direction, 'direction');
  assert.equal(L.validateRecord({ ...GOOD, amount: 0 }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, amount: 100001 }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, amount: 100.5 }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, amount: -50 }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, amount: 'abc' }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, amount: NaN }, TODAY).errors.amount, 'amount');
  assert.equal(L.validateRecord({ ...GOOD, eid: 'ramadan' }, TODAY).errors.eid, 'eid');
  assert.equal(L.validateRecord({ ...GOOD, year: 1999 }, TODAY).errors.year, 'year');
  assert.equal(L.validateRecord({ ...GOOD, year: 2101 }, TODAY).errors.year, 'year');
  assert.equal(L.validateRecord({ ...GOOD, year: 2026.5 }, TODAY).errors.year, 'year');
  assert.equal(L.validateRecord({ ...GOOD, date: '2026-11-20' }, TODAY).errors.date, 'date');
  assert.equal(L.validateRecord({ ...GOOD, date: '2026-02-30' }, TODAY).errors.date, 'date');
  assert.equal(L.validateRecord({ ...GOOD, note: 'x'.repeat(121) }, TODAY).errors.note, 'note');
  assert.equal(L.validateRecord({ ...GOOD, note: 'x'.repeat(120) }, TODAY).ok, true);
});

test('add/update/delete: sorted desc by date; update keeps id; delete removes', () => {
  const v1 = L.validateRecord({ ...GOOD, date: '2026-11-10' }, TODAY).record;
  const v2 = L.validateRecord({ ...GOOD, name: 'Abba', date: '2026-11-12', amount: 7000 }, TODAY).record;
  let list = L.addRecord([], v1);
  assert.equal(list.length, 1);
  list = L.addRecord(list, v2);
  assert.equal(list[0].name, 'Abba'); // newest date first
  assert.equal(list[1].name, 'Amma');
  const id = list[1].id;
  const upd = L.validateRecord({ ...GOOD, amount: 6000, date: '2026-11-10' }, TODAY).record;
  list = L.updateRecord(list, id, upd);
  assert.equal(list.length, 2);
  assert.equal(list.find((r) => r.id === id).amount, 6000);
  list = L.deleteRecord(list, id);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Abba');
  assert.equal(L.deleteRecord(list, 'nope').length, 1);
});

test('totals: sample received 25,500 / given 4,500 / net 21,000 / biggest 10,000 / avg 3,000', () => {
  const t = L.totals(S);
  assert.equal(t.received, 25500);
  assert.equal(t.given, 4500);
  assert.equal(t.net, 21000);
  assert.equal(t.count, 10);
  assert.equal(t.receivedCount, 6);
  assert.equal(t.givenCount, 4);
  assert.equal(t.biggest, 10000);
  assert.equal(t.average, 3000);
  assert.deepEqual(L.totals([]), { received: 0, given: 0, net: 0, count: 0, receivedCount: 0, givenCount: 0, biggest: 0, average: 0 });
  const neg = L.totals([{ ...GOOD, direction: 'given', amount: 9000 }]);
  assert.equal(neg.net, -9000);
  assert.equal(neg.biggest, 9000);
});

test('totalsByEid: fitr received 18,000/given 3,000; adha received 7,500/given 1,500', () => {
  const by = L.totalsByEid(S);
  assert.equal(by.fitr.received, 18000);
  assert.equal(by.fitr.given, 3000);
  assert.equal(by.fitr.net, 15000);
  assert.equal(by.fitr.count, 5);
  assert.equal(by.adha.received, 7500);
  assert.equal(by.adha.given, 1500);
  assert.equal(by.adha.net, 6000);
  assert.equal(by.adha.count, 5);
  assert.equal(L.totalsByEid([]).fitr.received, 0);
});

test('filterRecords: by eid, direction, relation, search, combined', () => {
  assert.equal(L.filterRecords(S, { eid: 'fitr' }).length, 5);
  assert.equal(L.filterRecords(S, { eid: 'adha' }).length, 5);
  assert.equal(L.filterRecords(S, { direction: 'given' }).length, 4);
  assert.equal(L.filterRecords(S, { direction: 'received' }).length, 6);
  assert.equal(L.filterRecords(S, { relation: 'family' }).length, 5);
  assert.equal(L.filterRecords(S, { relation: 'friend' }).length, 2);
  assert.equal(L.filterRecords(S, { relation: 'child' }).length, 1);
  assert.equal(L.filterRecords(S, { search: 'amm' }).length, 1);
  assert.equal(L.filterRecords(S, { search: 'RAHIM' }).length, 1);
  assert.equal(L.filterRecords(S, { search: 'xyz' }).length, 0);
  assert.equal(L.filterRecords(S, { eid: 'adha', direction: 'given' }).length, 2);
  assert.equal(L.filterRecords(S, { eid: 'fitr', direction: 'given', relation: 'family' }).length, 2);
  assert.equal(L.filterRecords(S, { eid: 'all', direction: 'all', relation: 'all', search: '' }).length, 10);
});

test('perPerson: sorted by net desc; Abba +10,000 first, Chacha Rahim -2,000 last', () => {
  const p = L.perPerson(S);
  assert.equal(p.length, 10);
  assert.deepEqual(p[0], { name: 'Abba', received: 10000, given: 0, net: 10000, count: 1 });
  assert.equal(p[1].name, 'Amma'); // tie 5,000: name ascending
  assert.equal(p[2].name, 'Boro Bhai');
  assert.equal(p[3].net, 3000);
  assert.equal(p[4].net, 2000);
  assert.equal(p[5].net, 500);
  assert.equal(p[6].name, 'Rafi');
  assert.equal(p[6].net, -500);
  assert.equal(p[7].name, 'Ayesha'); // tie -1,000: name ascending
  assert.equal(p[8].name, 'Karim Uncle');
  assert.equal(p[9].name, 'Chacha Rahim');
  assert.equal(p[9].net, -2000);
  const merged = L.perPerson([
    { ...GOOD, name: 'Amma', direction: 'received', amount: 1000 },
    { ...GOOD, name: 'amma', direction: 'given', amount: 400 },
    { ...GOOD, name: 'Amma', direction: 'received', amount: 200 }
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].received, 1200);
  assert.equal(merged[0].given, 400);
  assert.equal(merged[0].net, 800);
  assert.equal(merged[0].count, 3);
  assert.deepEqual(L.perPerson([]), []);
});

test('budgetProgress: fitr 2026 spent 3,000; budget 5,000 -> 60%, remaining 2,000', () => {
  const p = L.budgetProgress(S, 'fitr', 2026, 5000);
  assert.equal(p.spent, 3000);
  assert.equal(p.budget, 5000);
  assert.equal(p.remaining, 2000);
  assert.equal(p.pct, 60);
  assert.equal(p.over, 0);
  const over = L.budgetProgress(S, 'fitr', 2026, 1000);
  assert.equal(over.remaining, -2000);
  assert.equal(over.over, 2000);
  assert.equal(over.pct, 100); // capped at 100
  const adha = L.budgetProgress(S, 'adha', 2026, 1500);
  assert.equal(adha.spent, 1500);
  assert.equal(adha.pct, 100);
  assert.equal(adha.remaining, 0);
  const none = L.budgetProgress(S, 'fitr', 2026, 0);
  assert.equal(none.pct, null);
  assert.equal(none.spent, 3000);
  const otherYear = L.budgetProgress(S, 'fitr', 2025, 5000);
  assert.equal(otherYear.spent, 0);
  assert.equal(otherYear.remaining, 5000);
  assert.equal(otherYear.pct, 0);
  assert.equal(L.budgetKey('adha', 2026), 'adha-2026');
});

test('validateBudget: accepts 0..10,000,000 integers; rejects bad', () => {
  assert.equal(L.validateBudget('5000'), 5000);
  assert.equal(L.validateBudget(0), 0);
  assert.equal(L.validateBudget(10000000), 10000000);
  assert.equal(L.validateBudget(-1), null);
  assert.equal(L.validateBudget(10000001), null);
  assert.equal(L.validateBudget(12.5), null);
  assert.equal(L.validateBudget('abc'), null);
  assert.equal(L.validateBudget(''), 0);
});

test('validateImport: round-trip ok; rejects bad shape, bad record, bad budgets, too many', () => {
  const exp = L.exportData(S, { 'fitr-2026': 5000 });
  assert.equal(exp.app, 'eid-salami-bd');
  assert.equal(exp.version, 1);
  const ok = L.validateImport(exp, TODAY);
  assert.equal(ok.ok, true);
  assert.equal(ok.records.length, 10);
  assert.deepEqual(ok.budgets, { 'fitr-2026': 5000 });
  assert.equal(L.validateImport({ app: 'other', records: [] }, TODAY).ok, false);
  assert.equal(L.validateImport({ records: [] }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: 'nope' }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: [{ ...GOOD, amount: 0 }] }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: [{ ...GOOD, date: '2026-11-20' }] }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: [], budgets: { 'fitr-26': 100 } }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: [], budgets: { 'fitr-2026': -5 } }, TODAY).ok, false);
  assert.equal(L.validateImport({ app: 'eid-salami-bd', records: [], budgets: [] }, TODAY).ok, false);
  const big = { app: 'eid-salami-bd', records: Array.from({ length: 5001 }, () => ({ ...GOOD })) };
  assert.equal(L.validateImport(big, TODAY).ok, false);
  const noBudgets = L.validateImport({ app: 'eid-salami-bd', records: [] }, TODAY);
  assert.equal(noBudgets.ok, true);
  assert.deepEqual(noBudgets.budgets, {});
});

test('formatters: Bengali digits, taka grouping, date and Eid label in both languages', () => {
  assert.equal(L.fmtNum(25500, 'bn'), '\u09e8\u09eb\u09eb\u09e6\u09e6');
  assert.equal(L.fmtNum(2026, 'bn'), '\u09e8\u09e6\u09e8\u09ec');
  assert.equal(L.fmtNum(25500, 'en'), '25500');
  assert.equal(L.fmtTaka(25500, 'en'), TAKA + '25,500');
  assert.equal(L.fmtTaka(5000, 'bn'), TAKA + '\u09eb,\u09e6\u09e6\u09e6');
  assert.equal(L.fmtTaka(500, 'en'), TAKA + '500');
  assert.equal(L.fmtDate('2026-11-11', 'en'), '11 November 2026');
  assert.equal(L.fmtDate('2026-11-11', 'bn'), '\u09e7\u09e7 \u09a8\u09ad\u09c7\u09ae\u09cd\u09ac\u09b0 \u09e8\u09e6\u09e8\u09ec');
  assert.equal(L.eidLabel('fitr', 2026, 'en'), 'Eid-ul-Fitr 2026');
  assert.equal(L.eidLabel('adha', 2026, 'en'), 'Eid-ul-Adha 2026');
  assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(L.todayStr()), true);
});
