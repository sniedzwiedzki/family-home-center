# Run: recurring events and a margin before the first hour

Date: 2026-10-20
Spec: `.ai/specs/implemented/2026-10-20-recurring-events-and-hour-margin.md`

## Goal

Half-hour margin before the first hour of the expanded day; adding and changing events with repeating (weekly, weekly on chosen days, monthly, yearly), editable for a whole series, also by voice.

## Steps

1. Read the hour view, dialog, Google mapping; asked the user four questions (end of series, editing a series, local storage, assistant) and wrote the spec from the answers.
2. Hour margin: `LEADING_HOURS` in `dayHours.ts`; labels, forecast, events, now-line, click mapping, grid lines and CSS adjusted; the "first label" special case removed.
3. Model and mapping: `Recurrence`, `SeriesPort` in `calendar/types.ts`; form fields in `recurrence.ts` and `eventDraft.ts`; RRULE read/write in `google/recurrenceRule.ts`; series update in `googleCalendar.ts` (master event read, start day kept via `seriesShift.ts`).
4. Dialog: repeat select, weekday toggles, optional end date, scope switch with rule loading; `CalendarView` routes saves (create, single, occurrence, series).
5. Assistant: `repeat`, `repeatDays`, `repeatUntil` on `create_event`; refused without Google; `list_events` flags series members.
6. Screenshots at 1600 x 2400 shown to the user before any test run (their request); approved. Then tests, README, fake Google server learned to expand repeating events.

## Decisions

See the spec. Notable: repeating is tied to the presence of `CalendarPort.series`, so local storage needs no special cases; rules the app cannot model are kept untouched ("custom") rather than overwritten.

## Verification

- `npm run lint`, `npm run build` clean; `npm test`: 633 tests, 100% coverage.
- `npm run test:integration` locally: the new test (create a weekly event, see it a week later, edit the whole series) passes; the old hour-click test needed the margin in its geometry.
- Not tried: a real Google calendar and the real tablet.

## Open issues

- Real Google behaviour for `UNTIL` with timed events and for editing a series is untested.
