# Special events with a gold star

Date: 2026-10-26
Status: draft (implemented in code, not yet verified: lint, tests and build were not run on request)

## Requirement (from the user, translated from Polish)

Add a special event that is shown with a gold star in the calendar. Such an event has a special tag that can be set in the settings; by default it is `#star`.

## Decisions

- The special tag is a normal event tag (hidden property `fhcTags` or `#tag` in the title), so it works the same for local events and Google Calendar, and nothing new is stored on events.
- `Settings.specialTag` (default `star`) uses the same rules as a person's tag (`familyMemberSchema.shape.tag`): letters, digits, `_` or `-`, up to 20 characters, lower-cased. Settings saved before it existed load with the default.
- The settings form has a section "Wydarzenie specjalne" with one text field (no `#`). Saving is blocked when the tag is invalid or equal to a person's tag (the person's column and the star would be ambiguous).
- `EventItem` shows a gold star before the title when the event carries the current special tag. The tag reaches it through `SpecialTagContext` (provided in `App`, default `star`), so `CalendarView`, `DayRow` and `HourBody` need no new props. The star is inside the title span, so the two-line clamp still works.
- The event dialog has a checkbox "Wydarzenie specjalne" (`EventDraft.special` holds the tag to apply, or `null`). `draftFromEvent` takes the tag to detect it; `draftToInput` adds it to the event's tags.
- A special event without a person tag sits in "Inne" like any untagged event; the star does not change the column.
- The voice assistant keeps the star when it updates an event: `createToolExecutor` gets `specialTag` (read from the context in `useAssistant`). It does not set the star itself.
- Changing the special tag in the settings changes which events show a star; events keep their stored tags, so an old tag is simply no longer special.

## Testing

- Unit tests for the tag helpers, settings schema and migration, the settings editor and form, `EventItem` (star shown or not, custom tag), the event dialog checkbox, `draftFromEvent`/`draftToInput`, and the executor keeping the star. Still to run: `npm run lint`, `npm test`, `npm run build` and a look at 1600 x 2400 screenshots.
