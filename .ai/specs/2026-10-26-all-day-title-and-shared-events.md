# All-day events show only the title; shared events become one wide bar

Date: 2026-10-26
Status: draft (implemented in code, not yet verified: lint, tests and build were not run on request)

## Requirement (from the user, translated from Polish)

1. For all-day events do not show "cały dzień", only the title.
2. When the same event belongs to several people, merge it into one big row to show that several people take part.

## Decisions

- `EventItem` has no time line for an all-day event that starts on that day. A continuation day keeps "ciąg dalszy".
- "The same event for several people" means one event whose tags match several members (it was drawn once per column before). Separate events that merely look alike are not merged.
- `layoutDayEntries` (`src/calendar/dayLayout.ts`) splits an event's columns into runs of neighbouring columns. A run of two or more becomes one chip in the first cell of the run, as wide as all its columns (`--span`, with the 0.5625rem between cell contents added per gap), and an invisible `EventSpacer` of the same height in the other cells, so the other chips of those people sit below it. A run of one stays a normal chip. A band therefore never covers a person who is not involved (Anna and Tomek with Jan between them keep two chips).
- The chip lives in the cells' own grid row: no extra rows, so the grid lines are untouched and the columns of other people are not displaced. (The first version used extra grid rows above the cells; that removed the lines and pushed everyone else down.)
- A column carries at most one such chip: a later event that would overlap an earlier shared one stays per person.
- In the day row the shared chip's title is one line (ellipsis), so the spacer's height (one line per line of the chip) matches exactly.
- A shared chip is one `EventItem` with `sharedColors`: stripes of each person's pastel colour, one equal stripe per column.
- Hour view: timed events of an expanded day are still drawn per person in the hour grid. Merging there needs lane sharing across columns and is left out.

## Testing

- Unit tests for `layoutDayEntries`, `EventItem` (no all-day label, shared class) and `DayRow` (band placement). Still to run: `npm run lint`, `npm test`, `npm run build`, plus a look at 1600 x 2400 screenshots.
