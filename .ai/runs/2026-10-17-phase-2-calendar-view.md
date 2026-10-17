# Run: calendar phase 2 (calendar view)

Date: 2026-10-17
Spec: `.ai/specs/2026-10-17-calendar-first-iteration.md` (phase 2)
Branch: `phase-2-calendar-view`

## Steps

1. Added event model and `CalendarPort`, deterministic `createMockCalendar` (sample data until phase 4).
2. Pure helpers: day arithmetic, multi-day expansion with continuation markers, per-day ordering (all-day first, then time, then title), `#tag` stripping for display.
3. Hooks: `useCalendarEvents` (fetches only newly exposed days, merges by id, error state), `useDayWindow` (+-30 days, grows by 30), `useToday` (midnight rollover).
4. Components: `CalendarView` (sticky headers, endless scroll via IntersectionObserver sentinels, scroll anchoring on prepend, today anchoring), `DayRow`, `EventItem`; `ColumnHeaders` now takes columns and aligns with the day grid.
5. Unit tests (100%) and integration tests for the 2400 x 1600 viewport: shell text, today anchored under the header, more days load at the top.

## Decisions

- Rows are not JS-virtualised: the window grows by 30 days when a sentinel nears the viewport (1500 px margin). Day height is variable, so a fixed-height virtualiser would hide events. Revisit if the tablet struggles after long scrolling.
- Events are not clickable yet (editing is phase 5); the error alert has no retry button (retry/backoff and periodic refresh arrive with the Google client in phase 4).
- With no family members configured (settings UI is phase 6) every event lands in "Inne".

## Verification

- `npm run lint`, `npm run build`: pass. `npm test`: 99 tests, 100% coverage.
- Real-browser behaviour (scroll anchoring, IntersectionObserver) is covered only by the CI integration test; no browser can run in the authoring sandbox.

## Open issues

- Visual review at 2400 x 1600 still pending.
