/* eid-salami-bd - pure logic (no DOM). Node-testable.
 * Records: {id, name, relation, direction, amount, eid, year, date, note}
 * Dates are 'YYYY-MM-DD' strings; amounts are integer taka.
 * Budgets: { 'fitr-2026': 5000, ... } keyed by eid + '-' + year. */
/* In Node, load data.js; in the browser, data.js already set window.DATA. */
const DATA_REF = (typeof require === 'function') ? require('./data.js') : window.DATA;

function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(y, m) { // m 0-based
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
}
function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m - 1);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function newId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function budgetKey(eid, year) { return eid + '-' + year; }

/* Validate one record. Returns {ok, errors, record} where record is the
 * cleaned copy (trimmed name/note, numeric amount/year) when ok. */
function validateRecord(r, today) {
  const errors = {};
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name || name.length > 60) errors.name = 'name';
  if (!DATA_REF.RELATIONS.includes(r.relation)) errors.relation = 'relation';
  if (!DATA_REF.DIRECTIONS.includes(r.direction)) errors.direction = 'direction';
  const amount = typeof r.amount === 'string' ? Number(r.amount) : r.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount) ||
      amount < DATA_REF.MIN_AMOUNT || amount > DATA_REF.MAX_AMOUNT) errors.amount = 'amount';
  if (!DATA_REF.EIDS.includes(r.eid)) errors.eid = 'eid';
  const year = typeof r.year === 'string' ? Number(r.year) : r.year;
  if (typeof year !== 'number' || !Number.isFinite(year) || !Number.isInteger(year) ||
      year < DATA_REF.MIN_YEAR || year > DATA_REF.MAX_YEAR) errors.year = 'year';
  if (!isValidDateStr(r.date) || r.date > today) errors.date = 'date';
  if (r.note !== undefined && r.note !== null && (typeof r.note !== 'string' || r.note.length > 120)) errors.note = 'note';
  const ok = Object.keys(errors).length === 0;
  return {
    ok, errors,
    record: ok ? {
      id: typeof r.id === 'string' && r.id ? r.id : newId(),
      name, relation: r.relation, direction: r.direction, amount,
      eid: r.eid, year, date: r.date, note: (r.note || '').trim()
    } : null
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return (a.id < b.id ? -1 : 1);
  });
}
function addRecord(records, r) {
  return sortRecords([...records, r]);
}
function updateRecord(records, id, r) {
  return sortRecords(records.map((x) => (x.id === id ? { ...r, id } : x)));
}
function deleteRecord(records, id) { return records.filter((x) => x.id !== id); }

/* Dashboard totals over a list of records (already filtered if wanted). */
function totals(records) {
  let received = 0, given = 0, receivedCount = 0, givenCount = 0, biggest = 0;
  for (const r of records) {
    if (r.direction === 'received') { received += r.amount; receivedCount++; }
    else { given += r.amount; givenCount++; }
    if (r.amount > biggest) biggest = r.amount;
  }
  const count = records.length;
  return {
    received, given, net: received - given,
    count, receivedCount, givenCount, biggest,
    average: count ? Math.round(((received + given) / count) * 100) / 100 : 0
  };
}
/* Totals split by Eid (fitr/adha) for the dashboard breakdown. */
function totalsByEid(records) {
  const out = {};
  for (const eid of DATA_REF.EIDS) out[eid] = totals(records.filter((r) => r.eid === eid));
  return out;
}

/* Live filters: eid/direction/relation 'all' means no filter; search
 * matches a case-insensitive substring of the person name. */
function filterRecords(records, f) {
  const q = (f.search || '').trim().toLowerCase();
  return records.filter((r) =>
    (f.eid === 'all' || !f.eid || r.eid === f.eid) &&
    (f.direction === 'all' || !f.direction || r.direction === f.direction) &&
    (f.relation === 'all' || !f.relation || r.relation === f.relation) &&
    (!q || r.name.toLowerCase().includes(q)));
}

/* Per-person summary, sorted by net descending, then name ascending. */
function perPerson(records) {
  const map = new Map();
  for (const r of records) {
    const key = r.name.toLowerCase();
    if (!map.has(key)) map.set(key, { name: r.name, received: 0, given: 0, count: 0 });
    const p = map.get(key);
    if (r.direction === 'received') p.received += r.amount; else p.given += r.amount;
    p.count++;
  }
  const out = [...map.values()].map((p) => ({ ...p, net: p.received - p.given }));
  out.sort((a, b) => (b.net - a.net) || (a.name < b.name ? -1 : 1));
  return out;
}

/* Giving budget progress for one Eid+year. spent = Given total for that
 * Eid+year. Returns null progress when no budget is set (budget <= 0). */
function budgetProgress(records, eid, year, budget) {
  const spent = records
    .filter((r) => r.eid === eid && r.year === year && r.direction === 'given')
    .reduce((s, r) => s + r.amount, 0);
  if (!budget || budget <= 0) return { spent, budget: 0, remaining: 0, pct: null, over: 0 };
  const remaining = budget - spent;
  return {
    spent, budget,
    remaining,
    pct: Math.min(100, Math.round((spent / budget) * 100)),
    over: remaining < 0 ? -remaining : 0
  };
}
function validateBudget(v) {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 10000000) return null;
  return n;
}

/* Strict import validation:
 * {app:'eid-salami-bd', version:1, records:[...], budgets:{...}} */
function validateImport(data, today) {
  if (!data || typeof data !== 'object' || data.app !== 'eid-salami-bd' || !Array.isArray(data.records)) {
    return { ok: false, error: 'shape' };
  }
  if (data.records.length > DATA_REF.MAX_RECORDS) return { ok: false, error: 'too-many' };
  const records = [];
  for (const raw of data.records) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'record' };
    const v = validateRecord(raw, today);
    if (!v.ok) return { ok: false, error: 'record' };
    records.push(v.record);
  }
  const budgets = {};
  if (data.budgets !== undefined && data.budgets !== null) {
    if (typeof data.budgets !== 'object' || Array.isArray(data.budgets)) return { ok: false, error: 'budgets' };
    for (const [k, v] of Object.entries(data.budgets)) {
      if (!/^(fitr|adha)-\d{4}$/.test(k)) return { ok: false, error: 'budgets' };
      const b = validateBudget(v);
      if (b === null) return { ok: false, error: 'budgets' };
      budgets[k] = b;
    }
  }
  return { ok: true, records: sortRecords(records), budgets };
}
function exportData(records, budgets) {
  return {
    app: 'eid-salami-bd', version: 1, exportedAt: new Date().toISOString(),
    records: sortRecords(records), budgets: budgets || {}
  };
}

/* Bengali digits for bn locale; plain for en. */
const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
const TAKA = '\u09f3';
function fmtNum(n, lang) {
  const s = String(n);
  if (lang !== 'bn') return s;
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}
/* Integer taka with thousands separators, e.g. 25,500 -> '\u09f325,500'
 * (en) or '\u09f3\u09e8\u09eb,\u09eb\u09e6\u09e6' (bn). */
function fmtTaka(n, lang) {
  const grouped = String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return TAKA + fmtNum(grouped, lang);
}
function fmtDate(dateStr, lang) {
  const y = +dateStr.slice(0, 4), m = +dateStr.slice(5, 7) - 1, d = +dateStr.slice(8, 10);
  const mon = DATA_REF.I18N[lang].months[m];
  return fmtNum(d, lang) + ' ' + mon + ' ' + fmtNum(y, lang);
}
function eidLabel(eid, year, lang) {
  return DATA_REF.I18N[lang][eid === 'fitr' ? 'eidFitr' : 'eidAdha'] + ' ' + fmtNum(year, lang);
}

const __api = {
  isValidDateStr, daysInMonth, todayStr, newId, budgetKey,
  validateRecord, sortRecords, addRecord, updateRecord, deleteRecord,
  totals, totalsByEid, filterRecords, perPerson,
  budgetProgress, validateBudget, validateImport, exportData,
  fmtNum, fmtTaka, fmtDate, eidLabel
};
if (typeof module !== 'undefined') module.exports = __api;
if (typeof window !== 'undefined') window.__salamiLogic = __api;
