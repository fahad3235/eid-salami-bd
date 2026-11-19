/* eid-salami-bd - UI wiring. Loads after i18n.js + data.js + logic.js. */
(function () {
  'use strict';
  const L = window.__salamiLogic;
  const D = DATA;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let state = load();
  let editId = null;
  let filters = { eid: 'all', direction: 'all', relation: 'all', search: '' };
  let budgetSel = { eid: 'fitr', year: new Date().getFullYear() };

  function load() {
    try {
      const raw = localStorage.getItem(D.STORAGE_KEY);
      if (!raw) return { records: [], lang: 'en', budgets: {}, sample: false };
      const p = JSON.parse(raw);
      if (!p || !Array.isArray(p.records)) return { records: [], lang: 'en', budgets: {}, sample: false };
      return {
        records: p.records, lang: p.lang === 'bn' ? 'bn' : 'en',
        budgets: (p.budgets && typeof p.budgets === 'object') ? p.budgets : {},
        sample: !!p.sample
      };
    } catch { return { records: [], lang: 'en', budgets: {}, sample: false }; }
  }
  function save() { localStorage.setItem(D.STORAGE_KEY, JSON.stringify(state)); }
  function t(k) { return D.I18N[state.lang][k]; }
  function relLabel(r) { return t('rel' + r.charAt(0).toUpperCase() + r.slice(1)); }
  function showMsg(msg) { const el = $('#msg'); el.textContent = msg; el.hidden = false; clearTimeout(showMsg._t); showMsg._t = setTimeout(() => { el.hidden = true; }, 3500); }

  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $('#langBtn').textContent = t('langBtn');
    $('#sampleBadge').hidden = !state.sample;
  }

  function fillSelects() {
    const rel = $('#fRelation');
    rel.innerHTML = '';
    D.RELATIONS.forEach((r) => {
      const o = document.createElement('option'); o.value = r; o.textContent = relLabel(r); rel.appendChild(o);
    });
    const fr = $('#fltRelation');
    fr.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = t('filterAll'); fr.appendChild(all);
    D.RELATIONS.forEach((r) => {
      const o = document.createElement('option'); o.value = r; o.textContent = relLabel(r); fr.appendChild(o);
    });
    fr.value = filters.relation;
    $('#fltEid').value = filters.eid;
    $('#fltDirection').value = filters.direction;
    $('#fltSearch').value = filters.search;
  }

  function renderDashboard() {
    const tot = L.totals(state.records);
    $('#statReceived').textContent = L.fmtTaka(tot.received, state.lang);
    $('#statReceivedCount').textContent = L.fmtNum(tot.receivedCount, state.lang) + ' ' + t('countReceived');
    $('#statGiven').textContent = L.fmtTaka(tot.given, state.lang);
    $('#statGivenCount').textContent = L.fmtNum(tot.givenCount, state.lang) + ' ' + t('countGiven');
    const netEl = $('#statNet');
    netEl.textContent = (tot.net < 0 ? '-' : '') + L.fmtTaka(Math.abs(tot.net), state.lang);
    netEl.classList.toggle('neg', tot.net < 0);
    $('#statCount').textContent = L.fmtNum(tot.count, state.lang);
    $('#statBiggest').textContent = tot.biggest ? L.fmtTaka(tot.biggest, state.lang) : '-';
    $('#statAvg').textContent = tot.count ? L.fmtTaka(Math.round(tot.average), state.lang) : '-';
    $('#dashEmpty').hidden = tot.count > 0;
    const byEid = L.totalsByEid(state.records);
    const list = $('#byEidList');
    list.innerHTML = '';
    for (const eid of D.EIDS) {
      const years = [...new Set(state.records.filter((r) => r.eid === eid).map((r) => r.year))].sort((a, b) => b - a);
      for (const y of years) {
        const sub = L.totals(state.records.filter((r) => r.eid === eid && r.year === y));
        const li = document.createElement('li');
        const span = document.createElement('span'); span.textContent = L.eidLabel(eid, y, state.lang);
        const strong = document.createElement('strong');
        strong.textContent = L.fmtTaka(sub.received, state.lang) + ' ' + t('countReceived') + ' | ' +
          L.fmtTaka(sub.given, state.lang) + ' ' + t('countGiven');
        li.append(span, strong);
        list.appendChild(li);
      }
    }
    if (!list.children.length) {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = t('noData');
      li.appendChild(span); list.appendChild(li);
    }
  }

  function renderRecords() {
    const list = L.filterRecords(state.records, filters);
    $('#filterCount').textContent = t('filterCount').replace('{n}', L.fmtNum(list.length, state.lang));
    const body = $('#recBody');
    body.innerHTML = '';
    $('#recEmpty').hidden = state.records.length > 0;
    for (const r of list) {
      const tr = document.createElement('tr');
      const tdN = document.createElement('td'); tdN.textContent = r.name;
      const tdR = document.createElement('td'); tdR.textContent = relLabel(r.relation);
      const tdD = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = 'tag ' + (r.direction === 'received' ? 'recv' : 'given');
      tag.textContent = t(r.direction === 'received' ? 'dirReceived' : 'dirGiven');
      tdD.appendChild(tag);
      const tdA = document.createElement('td'); tdA.className = 'num'; tdA.textContent = L.fmtTaka(r.amount, state.lang);
      const tdE = document.createElement('td'); tdE.textContent = L.eidLabel(r.eid, r.year, state.lang);
      const tdDt = document.createElement('td'); tdDt.textContent = L.fmtDate(r.date, state.lang);
      const tdNt = document.createElement('td'); tdNt.textContent = r.note || '-';
      const tdA2 = document.createElement('td');
      const be = document.createElement('button'); be.className = 'btn small'; be.textContent = t('btnEdit');
      be.addEventListener('click', () => startEdit(r));
      const bd = document.createElement('button'); bd.className = 'btn small danger'; bd.textContent = t('btnDelete');
      bd.addEventListener('click', () => {
        if (!confirm(t('confirmDelete'))) return;
        state.records = L.deleteRecord(state.records, r.id);
        state.sample = state.records.some((x) => x.id.startsWith('s'));
        save(); renderAll(); showMsg(t('deleted'));
      });
      tdA2.append(be, bd);
      tr.append(tdN, tdR, tdD, tdA, tdE, tdDt, tdNt, tdA2);
      body.appendChild(tr);
    }
  }

  function renderPeople() {
    const rows = L.perPerson(state.records);
    const body = $('#peopleBody');
    body.innerHTML = '';
    $('#peopleEmpty').hidden = rows.length > 0;
    for (const p of rows) {
      const tr = document.createElement('tr');
      const tdN = document.createElement('td'); tdN.textContent = p.name;
      const tdR = document.createElement('td'); tdR.className = 'num'; tdR.textContent = L.fmtTaka(p.received, state.lang);
      const tdG = document.createElement('td'); tdG.className = 'num'; tdG.textContent = L.fmtTaka(p.given, state.lang);
      const tdNet = document.createElement('td'); tdNet.className = 'num';
      tdNet.textContent = (p.net < 0 ? '-' : '') + L.fmtTaka(Math.abs(p.net), state.lang);
      const tdC = document.createElement('td'); tdC.className = 'num'; tdC.textContent = L.fmtNum(p.count, state.lang);
      tr.append(tdN, tdR, tdG, tdNet, tdC);
      body.appendChild(tr);
    }
  }

  function renderBudget() {
    $('#bEid').value = budgetSel.eid;
    $('#bYear').value = budgetSel.year;
    const key = L.budgetKey(budgetSel.eid, budgetSel.year);
    const budget = state.budgets[key] || 0;
    $('#bAmount').value = budget || '';
    const p = L.budgetProgress(state.records, budgetSel.eid, budgetSel.year, budget);
    const bar = $('#budgetBar');
    if (p.pct === null) {
      bar.style.width = '0%'; bar.classList.remove('over');
      $('#budgetPct').textContent = t('budgetNoBudget');
    } else {
      bar.style.width = p.pct + '%'; bar.classList.toggle('over', p.over > 0);
      $('#budgetPct').textContent = t('budgetPct').replace('{n}', L.fmtNum(p.pct, state.lang)) + ' (' + L.fmtTaka(budget, state.lang) + ')';
    }
    $('#budgetSpent').textContent = L.fmtTaka(p.spent, state.lang);
    $('#budgetRemaining').textContent = p.budget ? L.fmtTaka(Math.max(0, p.remaining), state.lang) : '-';
    const overEl = $('#budgetOver');
    if (p.over > 0) { overEl.hidden = false; overEl.textContent = t('budgetOver').replace('{n}', L.fmtTaka(p.over, state.lang)); }
    else overEl.hidden = true;
  }

  function startEdit(r) {
    editId = r.id;
    $('#fName').value = r.name;
    $('#fRelation').value = r.relation;
    $('#fDirection').value = r.direction;
    $('#fAmount').value = r.amount;
    $('#fEid').value = r.eid;
    $('#fYear').value = r.year;
    $('#fDate').value = r.date;
    $('#fNote').value = r.note || '';
    $('#submitBtn').textContent = t('btnUpdate');
    $('#cancelEdit').hidden = false;
    switchTab('records');
    $('#fName').focus();
  }
  function resetForm() {
    editId = null;
    $('#recForm').reset();
    $('#fDate').value = L.todayStr();
    $('#fYear').value = new Date().getFullYear();
    $('#submitBtn').textContent = t('btnAdd');
    $('#cancelEdit').hidden = true;
    $('#formErr').textContent = '';
  }

  function switchTab(name) {
    $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.panel').forEach((p) => p.hidden = p.id !== 'panel-' + name);
  }

  function renderAll() { applyI18n(); fillSelects(); renderDashboard(); renderRecords(); renderPeople(); renderBudget(); }

  /* ---- events ---- */
  $$('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('#langBtn').addEventListener('click', () => { state.lang = state.lang === 'en' ? 'bn' : 'en'; save(); renderAll(); });
  $('#cancelEdit').addEventListener('click', resetForm);
  $('#recForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const raw = {
      id: editId || undefined,
      name: $('#fName').value, relation: $('#fRelation').value, direction: $('#fDirection').value,
      amount: $('#fAmount').value, eid: $('#fEid').value, year: $('#fYear').value,
      date: $('#fDate').value, note: $('#fNote').value
    };
    const v = L.validateRecord(raw, L.todayStr());
    if (!v.ok) {
      const e = v.errors;
      $('#formErr').textContent =
        e.name ? t('errName') : e.relation ? t('errRelation') : e.direction ? t('errDirection') :
        e.amount ? t('errAmount') : e.eid ? t('errEid') : e.year ? t('errYear') :
        e.date ? t('errDate') : t('errNote');
      return;
    }
    if (editId) { state.records = L.updateRecord(state.records, editId, v.record); showMsg(t('updated')); }
    else { state.records = L.addRecord(state.records, v.record); showMsg(t('saved')); }
    state.sample = state.records.some((x) => x.id.startsWith('s'));
    save();
    resetForm(); renderAll();
  });
  $('#fltEid').addEventListener('change', (e) => { filters.eid = e.target.value; renderRecords(); });
  $('#fltDirection').addEventListener('change', (e) => { filters.direction = e.target.value; renderRecords(); });
  $('#fltRelation').addEventListener('change', (e) => { filters.relation = e.target.value; renderRecords(); });
  $('#fltSearch').addEventListener('input', (e) => { filters.search = e.target.value; renderRecords(); });
  $('#budgetForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const eid = $('#bEid').value;
    const year = Number($('#bYear').value);
    const budget = L.validateBudget($('#bAmount').value);
    if (!D.EIDS.includes(eid) || !Number.isInteger(year) || year < D.MIN_YEAR || year > D.MAX_YEAR || budget === null) {
      $('#budgetErr').textContent = t('errYear');
      return;
    }
    $('#budgetErr').textContent = '';
    budgetSel = { eid, year };
    if (budget > 0) state.budgets[L.budgetKey(eid, year)] = budget;
    else delete state.budgets[L.budgetKey(eid, year)];
    save(); renderBudget(); showMsg(t('budgetSaved'));
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(L.exportData(state.records, state.budgets), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eid-salami-bd-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const r = L.validateImport(data, L.todayStr());
      if (!r.ok) { showMsg(t('importBad')); return; }
      state.records = r.records;
      state.budgets = r.budgets;
      state.sample = state.records.some((x) => x.id.startsWith('s'));
      save(); renderAll();
      showMsg(t('importOk').replace('{n}', L.fmtNum(r.records.length, state.lang)));
    } catch { showMsg(t('importBad')); }
    e.target.value = '';
  });
  $('#sampleBtn').addEventListener('click', () => {
    state.records = L.sortRecords([...D.SAMPLE]);
    state.sample = true;
    save(); renderAll(); showMsg(t('sampleLoaded'));
  });
  $('#clearInput').addEventListener('input', (e) => { $('#clearBtn').disabled = e.target.value !== 'DELETE'; });
  $('#clearBtn').addEventListener('click', () => {
    if ($('#clearInput').value !== 'DELETE') return;
    state.records = []; state.budgets = {}; state.sample = false;
    $('#clearInput').value = '';
    $('#clearBtn').disabled = true;
    save(); renderAll(); showMsg(t('cleared'));
  });

  resetForm();
  renderAll();
})();
