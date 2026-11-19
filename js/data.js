/* eid-salami-bd - data: sample records and constants. Pure ASCII.
 * i18n strings live in js/i18n.js (Bengali as \uXXXX escapes).
 * In Node, require i18n.js; in the browser, i18n.js loads first and
 * sets window.I18N. */
const I18N_REF = (typeof require === 'function') ? require('./i18n.js').I18N : window.I18N;

/* Sample records: clearly labelled sample data (Nov 2026).
 * Received 25,500 (6 records) / Given 4,500 (4 records) / Net 21,000.
 * Biggest 10,000 (Abba). Average 3,000 per record.
 * Eid-ul-Fitr 2026: received 18,000, given 3,000.
 * Eid-ul-Adha 2026: received 7,500, given 1,500. */
const SAMPLE = [
  { id: 's01', name: 'Amma', relation: 'family', direction: 'received', amount: 5000, eid: 'fitr', year: 2026, date: '2026-11-10', note: '' },
  { id: 's02', name: 'Abba', relation: 'family', direction: 'received', amount: 10000, eid: 'fitr', year: 2026, date: '2026-11-11', note: 'Biggest salami this Eid' },
  { id: 's03', name: 'Chacha Rahim', relation: 'family', direction: 'given', amount: 2000, eid: 'fitr', year: 2026, date: '2026-11-11', note: '' },
  { id: 's04', name: 'Nanu', relation: 'elder', direction: 'received', amount: 3000, eid: 'fitr', year: 2026, date: '2026-11-12', note: '' },
  { id: 's05', name: 'Ayesha', relation: 'family', direction: 'given', amount: 1000, eid: 'fitr', year: 2026, date: '2026-11-12', note: 'Cousin' },
  { id: 's06', name: 'Tanvir', relation: 'friend', direction: 'received', amount: 500, eid: 'adha', year: 2026, date: '2026-11-13', note: '' },
  { id: 's07', name: 'Rafi', relation: 'child', direction: 'given', amount: 500, eid: 'adha', year: 2026, date: '2026-11-13', note: '' },
  { id: 's08', name: 'Karim Uncle', relation: 'neighbour', direction: 'given', amount: 1000, eid: 'adha', year: 2026, date: '2026-11-14', note: '' },
  { id: 's09', name: 'Sadia', relation: 'friend', direction: 'received', amount: 2000, eid: 'adha', year: 2026, date: '2026-11-15', note: '' },
  { id: 's10', name: 'Boro Bhai', relation: 'family', direction: 'received', amount: 5000, eid: 'adha', year: 2026, date: '2026-11-16', note: '' }
];

const STORAGE_KEY = 'eid-salami-bd/v1';
const MAX_AMOUNT = 100000;
const MIN_AMOUNT = 1;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_RECORDS = 5000;
const RELATIONS = ['family', 'friend', 'neighbour', 'colleague', 'child', 'elder', 'other'];
const EIDS = ['fitr', 'adha'];
const DIRECTIONS = ['received', 'given'];

const DATA = { I18N: I18N_REF, SAMPLE, STORAGE_KEY, MAX_AMOUNT, MIN_AMOUNT, MIN_YEAR, MAX_YEAR, MAX_RECORDS, RELATIONS, EIDS, DIRECTIONS };

if (typeof module !== 'undefined') module.exports = DATA;
if (typeof window !== 'undefined') window.DATA = DATA;
