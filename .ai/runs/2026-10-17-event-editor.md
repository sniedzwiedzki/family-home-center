# Run: event editor on local storage

Date: 2026-10-17
Spec: `.ai/specs/2026-10-17-event-editor.md`
Branch: `event-editor` (stacked on `ui-day-rows`, PR #5)

## Steps

1. Extended `CalendarPort` with `createEvent`, `updateEvent`, `deleteEvent`; added `createLocalCalendar` (local storage key `fhc.events.v1`, zod-validated on load) and removed the sample-data mock.
2. `useCalendarEvents` got `reload()` (forgets what is loaded and refetches the visible range).
3. Pure form helpers `eventDraft.ts`: defaults for a new event, draft from an event, validation with Polish messages, conversion to an event (people as `fhcTags`, `#tag` in the title adds a person and is stripped, other hidden properties are kept).
4. `EventDialog` (new and edit share it): title, description, one toggle per person, all-day, date range, times, two-tap delete, validation and storage errors, Escape closes.
5. Clicking an empty spot of a day cell adds an event for that column's person ("Inne" preselects nobody); event chips became buttons that open the dialog; clicks do not leak to the cell or to the pinned today row.
6. Unit tests (100%) and a real-browser integration test: add from a person column, add a second person, edit, survive a reload, delete.

## Decisions

- The calendar now starts empty (the mock sample data is gone); events exist only in the browser.
- The native date and time inputs follow the browser locale (the sandbox Chrome shows US formats); the tablet's Chrome should use its own locale.
- Delete needs a second tap instead of a separate confirmation screen.

## Verification

- `npm run lint`, `npm run build`: pass. `npm test`: 267 tests, 100% coverage.
- `npm run test:integration`: 7 tests pass locally at 1600 x 2400.

## Open issues

- Recurring events and Google sync wait for the Google client (phase 4).
- Clicking cells is mouse/touch only; there is no keyboard path to add an event yet.

## Layout follow-ups in the same branch

- Day rows are lower (`min-height: 3.5rem`, tighter label and weather line); event chips are centred vertically in their cell so the margin above and below is equal.
- The clock moved to the middle of the top bar (bold, 1.75rem); the settings button stays right and the left is free for the planned AI button (README updated).
- Bug found by the lower rows: the initial window held too few rows below today for a tall screen, so the browser clamped the scroll and today did not start at the top; also, when both sentinels fired in one render, the prepend correction (scrollHeight difference) overshot. Fixes: the window starts 30 days before and 90 after today, and the prepend correction now keeps a real row (the first one below the headers) where it was.
- The pinned-today integration scenario loads a few batches of past days before expecting the bottom pin, since one batch now fits on screen.

