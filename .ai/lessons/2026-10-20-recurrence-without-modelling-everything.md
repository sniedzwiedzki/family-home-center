# Repeating events: model a small part, keep the rest untouched

Date: 2026-10-20

## Lessons

- Google rules are richer than the four options the app offers (intervals, counts, several rules). Parse only the exact shapes the app writes and call everything else `'custom'`; on save keep the rule as it is (`applyEventInput(..., 'keep')`) and keep `EXDATE`/`RDATE` lines when the rule is replaced. Overwriting would silently destroy a rule set in Google Calendar.
- For a timed event `UNTIL` must be a UTC time (iCalendar), for an all-day event a date; convert back to the local day when reading.
- An occurrence (`singleEvents=true`) is not the series: the rule lives on the master event (`recurringEventId`). Editing the whole series means reading the master and applying the new times to its own first day (`placeOnSeriesStart`), not to the occurrence's date.
- Gate a feature on the presence of an optional capability of the port (`CalendarPort.series`) instead of flags scattered through the UI.
- Integration geometry in tests (click positions computed from `--hours`) must follow layout changes such as the half-hour margin; `${...}` inside an `eval` string is interpolated by the test, not the browser.
