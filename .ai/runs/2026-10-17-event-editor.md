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

- `npm run lint`, `npm run build`: pass. `npm test`: 265 tests, 100% coverage.
- `npm run test:integration`: 7 tests pass locally at 1600 x 2400.

## Open issues

- Recurring events and Google sync wait for the Google client (phase 4).
- Clicking cells is mouse/touch only; there is no keyboard path to add an event yet.
