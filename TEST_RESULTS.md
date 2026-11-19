# eid-salami-bd - test results (2026-11-19, 11:00 slot)

## Unit tests - 13/13 pass, 159 assertions
`node tests/test.js` (node:test, ~27 ms)

```
data: 10 samples, i18n en/bn keys match, months 12, constants
isValidDateStr: leap day, bad month/day, wrong shape
validateRecord: accepts good; trims name/note; string amount/year coerced
validateRecord: rejects bad name, relation, direction, amount, eid, year, date, note
add/update/delete: sorted desc by date; update keeps id; delete removes
totals: sample received 25,500 / given 4,500 / net 21,000 / biggest 10,000 / avg 3,000
totalsByEid: fitr received 18,000/given 3,000; adha received 7,500/given 1,500
filterRecords: by eid, direction, relation, search, combined
perPerson: sorted by net desc; Abba +10,000 first, Chacha Rahim -2,000 last
budgetProgress: fitr 2026 spent 3,000; budget 5,000 -> 60%, remaining 2,000
validateBudget: accepts 0..10,000,000 integers; rejects bad
validateImport: round-trip ok; rejects bad shape, bad record, bad budgets, too many
formatters: Bengali digits, taka grouping, date and Eid label in both languages
tests 13, pass 13, fail 0
```

Hand-verified money math in the tests: sample totals (received 25,500,
given 4,500, net 21,000, biggest 10,000, average 3,000), per-Eid splits
(fitr 18,000/3,000; adha 7,500/1,500), per-person nets (Abba +10,000 down
to Chacha Rahim -2,000, ties broken by name), and budget progress
(fitr 2026: spent 3,000 of 5,000 = 60%, remaining 2,000; budget 1,000
over by 2,000, pct capped at 100).

## Headless-Chrome smoke - 52/52 pass
`node tests/smoke.mjs` (raw CDP, file://, fresh profile)

```
PASS title is Eid Salami BD
PASS empty state shown
PASS received 0 when empty
PASS net 0 when empty
PASS sample badge visible
PASS received 25,500
PASS given 4,500
PASS net 21,000
PASS 10 records
PASS biggest 10,000
PASS average 3,000
PASS 6 received count
PASS 4 given count
PASS by-Eid list has 2 entries
PASS 10 rows in records table
PASS filter Eid adha -> 5 rows
PASS filter count text 5
PASS filter direction given -> 4 rows
PASS search amm -> 1 row
PASS clear search -> 10 rows
PASS add record -> 11 rows
PASS given now 6,000
PASS net now 19,500
PASS amount 0 shows error
PASS still 11 rows after amount 0
PASS future date shows error
PASS still 11 rows after future date
PASS empty name shows error
PASS still 11 rows after empty name
PASS edit pre-fills amount 1500
PASS edit keeps 11 rows
PASS given now 6,500 after edit
PASS delete -> 10 rows
PASS people table has 10 rows
PASS first person is Abba (net 10,000)
PASS budget spent 3,000
PASS budget remaining 2,000
PASS budget pct 60% of budget
PASS no over-budget warning at 5000
PASS over-budget warning shown at 1000
PASS budget bar turns red when over
PASS title switches to Bengali
PASS received stat in Bengali digits
PASS title back to English
PASS clear button disabled initially
PASS clear button still disabled for DEL
PASS clear button enabled for DELETE
PASS after clear, empty state shown
PASS after clear, received 0
PASS 390px no horizontal overflow
PASS zero console/page errors
PASS zero non-file network requests
SMOKE: 52 passed, 0 failed
```

## Bugs found and fixed during testing (2)
1. `renderBudget` in `js/app.js` built the percentage line as
   `pct + '% ' + budgetPct.replace('{n}', '')`, which would have
   rendered "60% % of budget". Fixed to a single `{n}` substitution
   before running the smoke test; the smoke run asserts the exact
   "60% of budget" text.
2. Unit test for `fmtNum(25500, 'bn')` initially expected a thousands
   comma that `fmtNum` never adds (grouping lives in `fmtTaka` only).
   Fixed the expectation, not the code; both formatters now assert
   exact Bengali-digit output.

## ASCII check
`grep -rP '[^\x00-\x7F]'` over the whole project returns nothing: all
source files are pure ASCII. Bengali text exists only as `\uXXXX`
escapes in `js/i18n.js` (plus `\u09e6`-`\u09ef` digit escapes and the
`\u09f3` taka sign in `js/logic.js`).

## Status
Built, tested and documented only. No GitHub repo created, nothing
pushed (per task instructions).
