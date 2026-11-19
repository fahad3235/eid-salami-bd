/* eid-salami-bd headless-Chrome smoke test (raw CDP, no deps).
 * Run: node tests/smoke.mjs  (from the eid-salami-bd folder)
 * Loads index.html over file://, drives the real UI, collects
 * console/page errors, asserts visible state at 1440px and 390px.
 * NOTE: several assertions assume "today" is 2026-11-19 (sample data
 * covers Nov 2026: received 25,500 / given 4,500 / net 21,000). */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PAGE_URL = 'file:///home/hatch/workspace/muse-project-factory/builds/eid-salami-bd/index.html';
const PORT = 9231;
const TAKA = '\u09f3';
const BN_TITLE = '\u0988\u09a6 \u09b8\u09be\u09b2\u09be\u09ae\u09bf \u09ac\u09bf\u09a1\u09bf';

let pass = 0, fail = 0;
const errors = [];
const netReqs = [];
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' - ' + extra : '')); }
}

const chrome = spawn(SHELL, ['--headless', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('headless_shell did not start');
}

let msgId = 0;
const pending = new Map();
let ws;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}
async function click(selector) {
  await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('missing ' + ${JSON.stringify(selector)}); e.click(); return true; })()`);
}
async function setVal(selector, value) {
  await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
}

try {
  const wsUrl = await getWsUrl();
  ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE.ERROR: ' + JSON.stringify(m.params.args).slice(0, 300));
    if (m.method === 'Network.requestWillBeSent') netReqs.push(m.params.request.url);
  };
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(1500);
  await evalJs(`localStorage.clear()`);
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(1200);

  /* ---- empty state ---- */
  check('title is Eid Salami BD', await evalJs(`document.title.includes('Eid Salami BD')`));
  check('empty state shown', await evalJs(`!document.querySelector('#dashEmpty').hidden`));
  check('received 0 when empty', await evalJs(`document.querySelector('#statReceived').textContent`) === TAKA + '0');
  check('net 0 when empty', await evalJs(`document.querySelector('#statNet').textContent`) === TAKA + '0');

  /* ---- load sample data ---- */
  await click(`.tab[data-tab="data"]`);
  await sleep(300);
  await click('#sampleBtn');
  await sleep(400);
  check('sample badge visible', await evalJs(`!document.querySelector('#sampleBadge').hidden`));
  await click(`.tab[data-tab="dash"]`);
  await sleep(300);
  check('received 25,500', await evalJs(`document.querySelector('#statReceived').textContent`) === TAKA + '25,500');
  check('given 4,500', await evalJs(`document.querySelector('#statGiven').textContent`) === TAKA + '4,500');
  check('net 21,000', await evalJs(`document.querySelector('#statNet').textContent`) === TAKA + '21,000');
  check('10 records', await evalJs(`document.querySelector('#statCount').textContent`) === '10');
  check('biggest 10,000', await evalJs(`document.querySelector('#statBiggest').textContent`) === TAKA + '10,000');
  check('average 3,000', await evalJs(`document.querySelector('#statAvg').textContent`) === TAKA + '3,000');
  check('6 received count', await evalJs(`document.querySelector('#statReceivedCount').textContent`) === '6 received');
  check('4 given count', await evalJs(`document.querySelector('#statGivenCount').textContent`) === '4 given');
  check('by-Eid list has 2 entries', await evalJs(`document.querySelectorAll('#byEidList li').length`) === 2);

  /* ---- records tab: 10 rows; filters ---- */
  await click(`.tab[data-tab="records"]`);
  await sleep(300);
  check('10 rows in records table', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 10);
  await setVal('#fltEid', 'adha');
  await sleep(300);
  check('filter Eid adha -> 5 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 5);
  check('filter count text 5', await evalJs(`document.querySelector('#filterCount').textContent`) === '5 record(s) shown');
  await setVal('#fltEid', 'all');
  await setVal('#fltDirection', 'given');
  await sleep(300);
  check('filter direction given -> 4 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 4);
  await setVal('#fltDirection', 'all');
  await setVal('#fltSearch', 'amm');
  await sleep(300);
  check('search amm -> 1 row', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 1);
  await setVal('#fltSearch', '');
  await sleep(300);
  check('clear search -> 10 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 10);

  /* ---- add record (Test Bhai, given 1500, adha 2026, today) ---- */
  await setVal('#fName', 'Test Bhai');
  await setVal('#fRelation', 'friend');
  await setVal('#fDirection', 'given');
  await setVal('#fAmount', '1500');
  await setVal('#fEid', 'adha');
  await setVal('#fYear', '2026');
  await setVal('#fDate', '2026-11-19');
  await setVal('#fNote', 'Smoke test');
  await evalJs(`document.querySelector('#recForm').requestSubmit()`);
  await sleep(400);
  check('add record -> 11 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 11);
  await click(`.tab[data-tab="dash"]`);
  await sleep(300);
  check('given now 6,000', await evalJs(`document.querySelector('#statGiven').textContent`) === TAKA + '6,000');
  check('net now 19,500', await evalJs(`document.querySelector('#statNet').textContent`) === TAKA + '19,500');

  /* ---- invalid inputs rejected ---- */
  await click(`.tab[data-tab="records"]`);
  await sleep(300);
  await setVal('#fName', 'Bad One');
  await setVal('#fAmount', '0');
  await setVal('#fDate', '2026-11-19');
  await evalJs(`document.querySelector('#recForm').requestSubmit()`);
  await sleep(400);
  check('amount 0 shows error', await evalJs(`document.querySelector('#formErr').textContent.length > 0`));
  check('still 11 rows after amount 0', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 11);
  await setVal('#fAmount', '100');
  await setVal('#fDate', '2026-11-20');
  await evalJs(`document.querySelector('#recForm').requestSubmit()`);
  await sleep(400);
  check('future date shows error', await evalJs(`document.querySelector('#formErr').textContent.length > 0`));
  check('still 11 rows after future date', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 11);
  await setVal('#fDate', '2026-11-19');
  await setVal('#fName', '');
  await evalJs(`document.querySelector('#recForm').requestSubmit()`);
  await sleep(400);
  check('empty name shows error', await evalJs(`document.querySelector('#formErr').textContent.length > 0`));
  check('still 11 rows after empty name', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 11);

  /* ---- edit Test Bhai to 2000 ---- */
  await evalJs(`(() => { const rows = [...document.querySelectorAll('#recBody tr')]; const r = rows.find(x => x.textContent.includes('Test Bhai')); r.querySelectorAll('button')[0].click(); return true; })()`);
  await sleep(300);
  check('edit pre-fills amount 1500', await evalJs(`document.querySelector('#fAmount').value`) === '1500');
  await setVal('#fAmount', '2000');
  await evalJs(`document.querySelector('#recForm').requestSubmit()`);
  await sleep(400);
  check('edit keeps 11 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 11);
  await click(`.tab[data-tab="dash"]`);
  await sleep(300);
  check('given now 6,500 after edit', await evalJs(`document.querySelector('#statGiven').textContent`) === TAKA + '6,500');

  /* ---- delete Test Bhai ---- */
  await click(`.tab[data-tab="records"]`);
  await sleep(300);
  await evalJs(`(() => { window.confirm = () => true; const rows = [...document.querySelectorAll('#recBody tr')]; const r = rows.find(x => x.textContent.includes('Test Bhai')); r.querySelectorAll('button')[1].click(); return true; })()`);
  await sleep(400);
  check('delete -> 10 rows', await evalJs(`document.querySelectorAll('#recBody tr').length`) === 10);

  /* ---- people tab ---- */
  await click(`.tab[data-tab="people"]`);
  await sleep(300);
  check('people table has 10 rows', await evalJs(`document.querySelectorAll('#peopleBody tr').length`) === 10);
  check('first person is Abba (net 10,000)', await evalJs(`document.querySelector('#peopleBody tr').textContent.includes('Abba') && document.querySelector('#peopleBody tr').textContent.includes('10,000')`));

  /* ---- budget tab: fitr 2026, budget 5000 -> spent 3,000, remaining 2,000, 60% ---- */
  await click(`.tab[data-tab="budget"]`);
  await sleep(300);
  await setVal('#bEid', 'fitr');
  await setVal('#bYear', '2026');
  await setVal('#bAmount', '5000');
  await evalJs(`document.querySelector('#budgetForm').requestSubmit()`);
  await sleep(400);
  check('budget spent 3,000', await evalJs(`document.querySelector('#budgetSpent').textContent`) === TAKA + '3,000');
  check('budget remaining 2,000', await evalJs(`document.querySelector('#budgetRemaining').textContent`) === TAKA + '2,000');
  check('budget pct 60% of budget', await evalJs(`document.querySelector('#budgetPct').textContent.includes('60% of budget')`));
  check('no over-budget warning at 5000', await evalJs(`document.querySelector('#budgetOver').hidden`));
  await setVal('#bAmount', '1000');
  await evalJs(`document.querySelector('#budgetForm').requestSubmit()`);
  await sleep(400);
  check('over-budget warning shown at 1000', await evalJs(`!document.querySelector('#budgetOver').hidden && document.querySelector('#budgetOver').textContent.includes('2,000')`));
  check('budget bar turns red when over', await evalJs(`document.querySelector('#budgetBar').classList.contains('over')`));

  /* ---- language toggle ---- */
  await click('#langBtn');
  await sleep(400);
  check('title switches to Bengali', await evalJs(`document.querySelector('#appTitle').textContent`) === BN_TITLE);
  check('received stat in Bengali digits', await evalJs(`document.querySelector('#statReceived').textContent`) === TAKA + '\u09e8\u09eb,\u09eb\u09e6\u09e6');
  await click('#langBtn');
  await sleep(400);
  check('title back to English', await evalJs(`document.querySelector('#appTitle').textContent`) === 'Eid Salami BD');

  /* ---- clear-all requires typing DELETE ---- */
  await click(`.tab[data-tab="data"]`);
  await sleep(300);
  check('clear button disabled initially', await evalJs(`document.querySelector('#clearBtn').disabled`));
  await setVal('#clearInput', 'DEL');
  await sleep(200);
  check('clear button still disabled for DEL', await evalJs(`document.querySelector('#clearBtn').disabled`));
  await setVal('#clearInput', 'DELETE');
  await sleep(200);
  check('clear button enabled for DELETE', await evalJs(`!document.querySelector('#clearBtn').disabled`));
  await click('#clearBtn');
  await sleep(400);
  await click(`.tab[data-tab="dash"]`);
  await sleep(300);
  check('after clear, empty state shown', await evalJs(`!document.querySelector('#dashEmpty').hidden`));
  check('after clear, received 0', await evalJs(`document.querySelector('#statReceived').textContent`) === TAKA + '0');

  /* ---- 390px mobile: no horizontal overflow ---- */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(800);
  const overflow = await evalJs(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow', overflow <= 1, 'overflow=' + overflow);

  /* ---- errors + network ---- */
  check('zero console/page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  const external = netReqs.filter((u) => !u.startsWith('file://') && !u.startsWith('data:'));
  check('zero non-file network requests', external.length === 0, external.join(', ').slice(0, 200));
} catch (e) {
  fail++;
  console.log('FAIL harness error - ' + e.message);
} finally {
  try { chrome.kill(); } catch { /* already dead */ }
  console.log(`\nSMOKE: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
