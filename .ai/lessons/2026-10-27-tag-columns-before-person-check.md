# A column chosen by a tag wins over "has no person"

Date: 2026-10-27

## What happened

The columns by kind of event first sent every event without a family member's tag to "Inne" and only then looked at `#praca`. The user's first work event had no person, so it never showed in "Praca". The event dialog also kept only people and the special star from an event's tags, so saving a work event again would have dropped `#praca`.

## Lesson

- When a column (or any grouping) is chosen by a tag, check that tag before the fallback for "nobody in the family"; a work, school or similar tag means the event belongs there whoever it is for.
- Every tag the app gives meaning to must have a field in the event draft, or editing the event silently removes it. Adding a new meaningful tag means adding it to `EventDraft`, `draftFromEvent` and `draftToInput`.
