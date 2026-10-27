# Narrower shared-event chips

Date: 2026-10-27

## Goal

Make the chip of an event shared by neighbouring people narrower than all their columns, so the edge people's own chips can sit beside it (user's screenshot: "Paznokcie" moves up left of "Ortopeda Koszalin", "Basen" moves up right of it).

## Spec

`.ai/specs/implemented/2026-10-26-all-day-title-and-shared-events.md`, requirement 3 and its decision.

## Steps and decisions

- The chip now runs from the middle of the first column to the middle of the last one. A fixed half was chosen over the chip's text width, because the last cell's spacer must know the width without measuring.
- `layoutDayEntries` marks the last spacer of a run (`isLast`); `EventSpacer` gets class `is-end`; `DayRow` gives a cell with a chip or spacer the class `has-band`.
- CSS: a `has-band` cell is a block (not flex), the chip floats right and takes only the right half of its own cell (negative right margin), the last spacer floats left over half of its cell, so own chips flow beside them and wrap below.
- First try left 1 px too little room: the right margin (gap) of the last chip in a line also needs space. A `has-band` cell now reaches 0.3125rem into the next cell's padding (negative right margin) and the geometry uses `100% - 0.3125rem` as the cell's own width.

## Second round (user feedback with a screenshot)

1. An all-day shared chip next to timed chips was shorter than they are. `layoutDayEntries` now gives the band and its spacers `hasTimeLine` when the event or any own chip of the first or last person of the run has a time line; `hasTimeLine` moved to `dayLayout.ts` and `EventItem`'s time label uses it.
2. A shared chip with nothing beside it could be smaller. The floated half-to-half box became an invisible `.event-band` (an `EventSpacer` gives it its height); the chip is absolutely placed over the band's height, centred and only as wide as its text. `--span` moved from the chip to the band.
3. The shared chip had the grey default border. It now has two background layers: the 28% stripes for the fill (padding box) and the 50% stripes for the border (border box) under a transparent border, the same mix as other chips.

## Third round

1. "ciąg dalszy" only on a following day the event ends during. `groupEventsByDay` sets `endsThisDay` (optional on `DayEntry`, so existing fixtures need no change); `hasTimeLine` uses it for continuation entries. README updated.
2. "Basen" of Jan and Zosia stayed per person because Jan's column already had the "Ortopeda" band (one band per column). Bands now claim column halves (`halvesOf`): right half of the first column, the columns in between, left half of the last. A band that ends in a column and one that starts there both fit; the end spacer is put first in the cell and `.event-spacer.is-end + .event-band` lets its gap overlap the next band. Shared chips stay 0.3125rem short of their band so two meeting chips keep a gap.

## Fourth round (regression)

- Round two made every shared chip as wide as its text, so a 3-person all-day chip with a short title ("Chrzest Julki") sat inside the middle person's column only. A band of three or more people now has class `is-wide` and its chip fills the band (from the middle of the first column to the middle of the last); two-person chips stay text-wide.

## Fifth round

- The last person's own chips ("Balet" next to "Okulista", Zosia's "Basen" next to "Dzień Dyni") started at the middle of the column, leaving a gap after a text-wide chip. New hook `useElementWidths` (ResizeObserver, stable ref callback per key, disconnects on unmount) measures two-person chips; `EventItem` takes a `ref`; `EventSpacer` takes `chipWidth` and sets `--chip-width`; the end spacer is `calc((var(--chip-width, 100% + 0.25rem)) / 2 - 0.28125rem)`. The extra brackets matter: `var()` substitutes its fallback as plain text, and without them `100% + 0.25rem / 2` made the spacer a whole column wide.
- The browser pane was hidden, so the page got no rendering frames and the ResizeObserver never fired (refs attached, confirmed with temporary logs, since removed). The geometry was checked by setting `--chip-width` from the chips' real widths by hand. `agent-browser` had no browser installed on this Windows machine and was stopped instead of downloading one.

## Sixth round

- Cells never centre their chips vertically: `.day-cell` uses `align-content` and `align-items: flex-start`; the row class `has-shared` and its CSS rule (top alignment only for rows with a shared chip) were removed as dead. A shared chip's text now starts at the top too (still centred horizontally).
- The only chip of a cell gets `min-height: 100%` (`.day-cell > .event:only-child`). A shared event grows only when it is alone in every cell of its run: `layoutDayEntries` counts bands per column and sets `isAlone` on the shared item and its spacers (classes `is-alone` on `.event-band` and `.event-spacer`).
- With the pane visible, the live ResizeObserver path worked: end spacers got `--chip-width` (e.g. 183.7 px) and the next chips sat 5 px after the shared chip. The first screenshot was a stale frame from before the measurement.

## Seventh round

- The user asked to revert the full-row-height rule from round six. Removed `isAlone` (layout, `EventSpacer`, `DayRow`) and the `min-height: 100%` CSS rule; the top-left alignment stays.

## Eighth round

- "Koncert w przedszkolu - galowy strój" (two people) was cut off at the band (middle to middle) although the outer halves were empty. Two-person bands alone in their columns (`canWiden`) let the chip grow to both columns' contents; the band gets `--chip-width` and a `--shift` left margin, so its first cell reserves only the chip's real part. Chips centred with `inset: 0 -50%`.
- Checked with `--chip-width` set by hand (pane hidden again, no frames): the full title shows (450 to 797, centred on the boundary at 623); with own chips beside it, they wrap below because they no longer fit; a very long title stops at the outer edges of both columns (388 to 860) with an ellipsis; two bands meeting in Jan's column keep the old limit; a short chip still has its neighbour 5 px after it.

## Files changed

- `src/calendar/days.ts`, `src/calendar/dayLayout.ts`, `src/calendar/DayRow.tsx`, `src/calendar/useElementWidths.ts` (new), `src/calendar/EventItem.tsx`, `src/calendar/calendar.css`
- Tests: `dayLayout.test.ts`, `days.test.ts`, `DayRow.test.tsx`, `EventItem.test.tsx`, `useElementWidths.test.ts` (new), helper `fakeResizeObserver.ts` (new)
- Spec (moved to `.ai/specs/implemented/`), `README.md`, two lessons

## Verification

- Dev server, 1600 x 2400 viewport, local events: two-person timed chip with own chips on both sides beside it, a three-person all-day chip (middle person's chip below the full-width spacer, edge people beside it), a chip next to a column whose own chip is too wide for the free half (wraps below). Chip and end spacer edges measured equal (x = 503). No console errors.
- Second round, same viewport: an all-day 3-person chip beside timed chips is 58 px tall like them; a lone timed shared chip (Basen) is 106 px wide instead of 241 px; an all-day shared chip beside all-day chips stays 37 px; shared chip border is transparent over the 50% stripes. No console errors.
- Third round, same viewport: "Ortopeda" (Anna + Jan) and "Basen" (Jan + Zosia) on one day are two bands on one line meeting at x = 503 in Jan's column; an all-day 3-day event shows no "ciąg dalszy"; a timed event from 20:00 to 10:00 two days later shows nothing on the middle day and "ciąg dalszy" on its last day. No console errors.
- Fourth round, same viewport: "Chrzest Julki" (Jan, Zosia, Tomek) spans x 506 to 982 (middle of Jan's column to middle of Tomek's), "Aparat" of Zosia below it; two-person chips unchanged.
- Fifth round: with `--chip-width` set to each chip's real width, every end spacer ends exactly at its chip's right edge (436, 682, 475, 676) and the next own chip starts 5 px after it ("Balet" 441, "Basen" 687). The live ResizeObserver path was confirmed in round six.
- Sixth round, same viewport, row of 29 Oct (198 px tall because of Ola's three chips): every chip starts 4 px from the top; the lone "Lekarz" chip, the lone two-person "Spacer" band and its spacer are 189 px tall (the whole row less padding); the row did not grow. No console errors.
- After the user approved the look: `npm run lint` clean; `npm test` 702 passed, coverage 100% statements, branches, functions and lines; `npm run build` succeeded. `npm run test:integration` was not run locally (agent-browser has no Chrome installed on this Windows machine); CI runs it on the PR.
- Tests: `ResizeObserver` is stubbed per test file with `FakeResizeObserver` (`src/calendar/fakeResizeObserver.ts`, a test helper typed with the DOM lib; `tests/` is type-checked with the Node config, which has none). The hook creates its observer only when it gets an element, so removing a chip never needs one.

## Open issues

- Two separate events that only look alike (same title and time, different event ids) are still not merged.
- Where two shared chips meet in one column, both keep the middle-to-middle limit, so long titles there are still cut with an ellipsis.
