# Columns by kind of event

Date: 2026-10-27

## Goal

Replace the fixed column per person with four columns by kind of event (Wszystkie, Powtarzalne, Praca, Inne), keep people's colours and merged chips inside one column, turn the header into a legend, make the widths and the work tag configurable, add a "Praca" checkbox, slant the colour split of merged chips, and tidy the date column.

## Spec

`.ai/specs/implemented/2026-10-27-columns-by-kind.md`. It supersedes `.ai/specs/archive/2026-10-26-all-day-title-and-shared-events.md` (moved from `implemented/` to `archive/`).

## Steps and decisions

1. Prototype first, at the user's request: code only, no tests, spec or docs, looked at in a 1600 x 2400 viewport. Branch `columns-by-kind` from `main` after PR #25 was merged.
2. `columnForEvent` puts each event in one column. The first version checked "no family member" before the work tag, so the user's first work event (no person) landed in "Inne"; the work tag now goes first.
3. The dialog only kept people and the special star from an event's tags, so saving a work event again would drop `#praca`. The draft got a `work` field and the dialog a "Praca" checkbox; a new event from the Praca column has it ticked.
4. Daily or weekly series are told apart from monthly and yearly ones by the gaps between their loaded occurrences (an occurrence has no rule; the rule lives on the master).
5. Slanted stripes: `linear-gradient(135deg, ...)` for fill and border.
6. No chevron by the date (`ChevronIcon` removed), weekday 1.25rem, date column 5.5rem.
7. After approval: chips no longer span columns, so the bands, spacers, half-column claims, `useElementWidths`, the fake ResizeObserver and their CSS from PR #25 were removed as dead code; `CalendarColumn` is now `{ id, width }`. Column settings draft helpers went to `columnLayoutDraft.ts` (like `fontSizes.ts`); the form cannot be saved while a column value is invalid, like the other editors.
8. Tests rewritten for the new routing (unit) and the new column ids (integration: `all`, `recurring`, `work`, `other`; a weekly series is checked in "Powtarzalne", an event added from "Praca" lands there). README and AGENTS.md (kiosk layout rule) updated.

## Files changed

- `src/calendar/columns.ts`, `dayLayout.ts`, `DayRow.tsx`, `HourBody.tsx`, `EventItem.tsx`, `ColumnHeaders.tsx`, `CalendarView.tsx`, `EventDialog.tsx`, `eventDraft.ts`, `calendar.css`; `src/assistant/toolExecutor.ts`; `src/settings/settings.ts`, `SettingsForm.tsx`, `ColumnLayoutEditor.tsx` (new), `columnLayoutDraft.ts` (new); `src/shell/icons.tsx`; `src/App.tsx`
- Removed: `src/calendar/useElementWidths.ts` (+ test), `src/calendar/fakeResizeObserver.ts`
- Tests: `columns`, `dayLayout`, `DayRow`, `HourBody`, `EventItem`, `ColumnHeaders`, `CalendarView`, `EventDialog`, `eventDraft`, `settings`, `SettingsForm`, `ColumnLayoutEditor` (new), `columnLayoutDraft` (new); `tests/integration/app.int.test.ts`
- Docs: spec (new), archived spec, README, AGENTS.md, this log

## Verification

- Prototype looked at in a 1600 x 2400 viewport against local events after each step: four columns, legend on the right, striped chips in one cell, work event without a person in "Praca", the "Praca" box ticked from the Praca column and kept on edit, date column content 75 of 88 px, date still expands the day. No console errors.
- `npm run lint` clean; `npm test` 695 passed, coverage 100% statements, branches, functions and lines; `npm run build` succeeded.
- `npm run test:integration` not run locally (agent-browser has no Chrome on this Windows machine); CI runs it.

## Open issues

- "Powtarzalne" was not seen with real Google series locally (local events cannot repeat); the integration test covers a weekly series against the fake Google server.
- The voice assistant uses the default work tag `praca`, not the one from the settings.
