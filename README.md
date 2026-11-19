# Eid Salami BD - Track Eid Salami Given & Received

Offline, bilingual (English / Bangla) Eid salami tracker for Bangladesh.
Record salami you give and receive, watch totals and net balance, set a
giving budget per Eid, see who you exchange the most with - all in the
browser, no account, no network.

## Features

- **Salami records** - add, edit and delete records: person name (1-60
  chars), relation (Family / Friend / Neighbour / Colleague / Child /
  Elder / Other), direction (Received / Given), amount Tk 1-100,000
  (integer taka), Eid (Eid-ul-Fitr / Eid-ul-Adha), year, date (real
  calendar date, not in the future), optional note of 120 chars or less.
  Full input validation with clear error messages; empty state when no
  records exist.
- **Dashboard** - total received, total given, net balance (received
  minus given), record counts, biggest single salami, average per record,
  plus a received/given breakdown per Eid and year. All computed from
  your own data only.
- **Giving budget** - set a budget (Tk) for any Eid + year; progress bar
  with spent, remaining and percentage, counting your Given records for
  that Eid. Over-budget state warns you and turns the bar red.
- **Filters** - by Eid, direction, relation, and free-text name search;
  the list updates live and the shown record count is displayed.
- **Per-person summary** - totals received from and given to each person,
  with net and record counts, sorted by net (highest first).
- **Data tools** - export/import JSON (strict validation: correct app,
  version, record shape and budget keys), clearly-labelled sample data,
  clear-all that only works after typing DELETE. Everything persists in
  `localStorage` under one versioned key.
- **Bilingual UI** - English / Bangla toggle, persisted; Bengali digits in
  Bengali mode. All UI strings live in `js/i18n.js`. Responsive down to
  390 px; zero network requests.

## Stack

Vanilla HTML + CSS + JavaScript, no dependencies, no build step. Open
`index.html` in any modern browser, or serve the folder with any static
server.

## Install & run

```bash
# just open it
open index.html
# or serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Testing

```bash
node tests/test.js    # 13 node unit tests, 159 assertions (logic, validation, totals, filters, per-person, budget, import)
node tests/smoke.mjs  # 52 headless-Chrome (raw CDP) UI assertions
```

## Source files

- `index.html` - five tabs: Dashboard, Records, People, Budget, Data
- `css/style.css` - festive green + gold theme, responsive to 390 px
- `js/i18n.js` - all UI strings (English + Bangla); Bengali written as
  `\uXXXX` escapes so every source file stays pure ASCII
- `js/data.js` - sample records, constants, storage key
- `js/logic.js` - pure, testable logic: validation, totals, per-person
  summary, budget progress, filtering, import validation
- `js/app.js` - UI wiring and `localStorage` persistence

## Limitations

- This app keeps your own salami log; it does not send, receive or
  verify any money, and it holds no official Eid dates - you pick the
  Eid and year for each record yourself.
- Data lives in one browser's `localStorage`; use Export JSON to move it.
- Sample data (Nov 2026, 10 records: received Tk 25,500, given Tk 4,500)
  is labelled as sample; replace it with your own records.

## Status

MVP complete. Factory run (2026-11-19, 11:00 slot). Built, tested and
documented only - no GitHub repo created, nothing pushed.
