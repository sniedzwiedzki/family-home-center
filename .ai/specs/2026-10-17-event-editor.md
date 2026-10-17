# Event editor (add, edit, delete) on local storage

Date: 2026-10-17
Status: implemented (local storage); Google comes with phase 4

## Requirements (from the user)

1. Clicking a day in a person's column opens a modal to add an event. The column's person is selected by default, but the user can change the selection or add more people.
2. Editing uses the same modal.
3. For now events live only in the browser's local storage, for testing, until the Google API key is available.

## Decisions

- Events are stored under `fhc.events.v1` behind the existing `CalendarPort`, extended with `createEvent`, `updateEvent` and `deleteEvent`. The later Google client implements the same port. The sample-data mock is removed; the calendar starts empty.
- Clicking an empty spot of a day cell opens "Nowe wydarzenie" for that day and column; clicking an event chip opens "Edytuj wydarzenie". Chips stop the click so it does not also open the new-event modal. The pinned copy of today behaves the same.
- The "Inne" column pre-selects nobody (an event with no people lands in "Inne"). Otherwise the column's person is pre-selected.
- Fields: Tytuł (required), Opis, Osoby (one toggle per family member, several allowed), Cały dzień, Data, Do dnia, Od, Do (times only when not all-day). Defaults for a new event: 09:00-10:00 on the clicked day, not all-day.
- People are saved in the event's hidden property `fhcTags` (comma separated tags). `#tag` typed in the title also adds that person and is removed from the stored title. When editing, the title is shown without `#tags` and the people come from the tags.
- Validation messages (Polish): "Podaj tytuł", "Podaj datę", "Podaj godziny", "Koniec musi być po początku", "Data końca nie może być przed początkiem". The dialog stays open and shows "Nie udało się zapisać wydarzenia" when storing fails.
- Delete asks for a second tap ("Na pewno usunąć?") because it is destructive.
- After every write the calendar reloads its events.

## Assumptions (change on request)

- Recurring events do not exist in local storage, so the "this / following / all" question comes with the Google client.
- A timed event may cross midnight (end date later than start date).
- Time zone is the device's.

## Out of scope

Google Calendar, recurrence, drag and drop, reminders.
