# Recurring events and a margin before the first hour

Date: 2026-10-20
Status: implemented (series editing and the voice option are covered by fake-server tests; try them on the real calendar)

## Requirements (from the user)

1. In the expanded day view the first hour (7:00) looks uneven. Add a half-hour margin before the first hour.
2. Adding and changing an event can switch repeating on. Options: every week, every week on chosen weekdays, every month on that day, every year on that day.

## Decisions (answered by the user)

- **End of the series**: optional "Powtarzaj do dnia" date; no end by default.
- **Editing a repeating event**: a switch at the top of the dialog, "To wystąpienie" (default) or "Cała seria". The repeat rule can only be edited in series mode.
- **Without Google**: repeating is available only with Google Calendar. With local storage the repeat controls are hidden.
- **Voice assistant**: `create_event` takes the repeat options right away.

## Design

### Hour margin

The hour grid starts half an hour before the first shown hour (6:30 for the usual 7:00). The first hour label is then placed like every other label and nothing is cramped against the top edge. The special "first label" styling goes away. Hour lines are drawn at the hour boundaries, including the first one; the click-to-add mapping, the event offsets and the now-line account for the margin.

### Model

- `Recurrence { frequency: 'weekly' | 'monthly' | 'yearly'; weekdays: number[]; until: string | null }`. `weekdays` (0 = Sunday ... 6 = Saturday) is used by weekly only; empty means the weekday of the start. `until` is the last day (`YYYY-MM-DD`).
- `CalendarEventInput.recurrence` is used by `createEvent`; `updateEvent(event, recurrence?)` sets the rule of a single (non-repeating) event, which then becomes a series.
- `CalendarPort.series?: SeriesPort` exists only for Google: `loadRule(event)` reads the rule of the series of an occurrence (`Recurrence`, or `'custom'` when Google has a rule the app does not model) and `update(event, input, keepRule)` changes the whole series. Presence of `series` is what shows the repeat controls.

### Google mapping

- Rules are Google `RRULE`s: `FREQ=WEEKLY`, `FREQ=WEEKLY;BYDAY=MO,WE`, `FREQ=MONTHLY`, `FREQ=YEARLY`, plus `UNTIL` (a date for all-day events, end of that day in UTC for timed ones, as the iCalendar format requires for events with a time zone).
- Only a single `RRULE` of these shapes is read back as a `Recurrence`; anything else (`INTERVAL`, `COUNT`, `BYSETPOS`, several rules) is `'custom'`: the dialog says so and a save keeps the rule untouched. Other lines of the `recurrence` array (`EXDATE`, `RDATE`) always survive.
- Monthly "that day" for the 29th to 31st skips months without that day, as Google Calendar does.
- Series update: the master event is read, its start date is kept, and the new times, title, description, people and rule are applied (the duration of the edited occurrence is kept). The date fields are hidden in series mode.
- Turning repeating off in series mode removes the rule from the master (it becomes a single event).

### Dialog

A "Powtarzaj" select (Nie powtarzaj, Co tydzień, Co tydzień w wybrane dni, Co miesiąc tego dnia, Co rok tego dnia), weekday toggles (Pn..Nd) for the chosen-days option, an optional "Powtarzaj do dnia". Validation: at least one weekday ("Wybierz dni tygodnia"), end date not before the start ("Koniec powtarzania nie może być przed początkiem"). For an occurrence of a series the select is hidden until "Cała seria" is chosen; then the rule is loaded ("Ładowanie…", Save disabled while loading, an error is shown if loading fails).

### Assistant

`create_event` gets `repeat` (`weekly`, `weekdays`, `monthly`, `yearly`), `repeatDays` (`mon`..`sun`) and `repeatUntil`. Without Google the tool answers that repeating needs Google Calendar. `update_event` does not change repeating; `list_events` reports whether an event is part of a series.

## Out of scope

Intervals ("every 2 weeks"), counts, "this and following", editing the date of a series, repeating in local storage.

## Verification

100% unit coverage; the integration test that adds a weekly event through the fake Google server and sees it in two weeks; 1600 x 2400 screenshots of the hour margin and of the dialog.
