# Columns by kind of event instead of one column per person

Date: 2026-10-27
Status: implemented (2026-10-27)
Supersedes: `.ai/specs/archive/2026-10-26-all-day-title-and-shared-events.md` (chips spanning neighbouring person columns)

## Requirement (from the user)

1. Drop the fixed column per person; it does not work well. Keep each person's event colour and the merged ("chipped") look for events of several people, but inside one column.
2. Columns, from the right: **Inne** (as before: events of nobody in the family), **Praca** (family events with the `#praca` tag), **Powtarzalne** (family events of daily or weekly series), **Wszystkie** (the other family events).
3. No column names. The header row stays as a legend of the people only (no "Inne"), on the right.
4. The settings can change the column widths and the tag of "Praca".
5. The event dialog has a "Praca" checkbox.
6. The colours of a chip of several people are split by slanted 45° lines ("/"), not vertical ones.
7. No up/down arrow next to the day number (the date stays clickable); a slightly bigger weekday; a narrower date column.

## Decisions

- Every event is in exactly one column (`columnForEvent` in `src/calendar/columns.ts`), checked in this order: the work tag → Praca; no family member's tag → Inne; an occurrence of a daily or weekly series → Powtarzalne; otherwise Wszystkie. The work tag goes first so a work event without a person is in Praca (the user's first test event had no person and landed in Inne).
- An occurrence does not carry its rule (it lives on the series master), so `frequentSeries` calls a series daily or weekly when two of its loaded occurrences start at most 7 days apart. Monthly and yearly series (birthdays) stay in Wszystkie. Events in local storage cannot repeat.
- A chip's colour comes from its people (`chipColors`): one person's colour, stripes of each person's colour for several (`sharedColors`, slanted with `linear-gradient(135deg, ...)`, for both fill and border), the default grey for nobody. Chips no longer span columns, so the bands, spacers, half-column claims, chip measuring (`useElementWidths`, `ResizeObserver`) and their CSS from the superseded spec are removed.
- Column widths are relative weights (0.5 to 10, `fr` units) in `settings.columns.widths`, with the work tag in `settings.columns.workTag`; defaults 3, 2, 1.5, 1.5 and `praca`. Settings saved before this load with the defaults. The grid takes `--column-template` from them.
- Tapping an empty cell opens a new event with no person chosen (columns are no longer people); in Praca the "Praca" box is ticked. The dialog keeps the work tag of an existing event when it is saved again (it used to drop tags other than people and the special star). The voice assistant uses the default work tag.
- The header (`ColumnHeaders`) keeps the home button on the left and shows the people as a legend on the right.
- Date column 5.5rem instead of 6.75rem; weekday 1.25rem instead of 1rem; the chevron and its CSS are gone (`ChevronIcon` removed).

## Testing

- Unit tests for routing (`columnForEvent`, `frequentSeries`, `chipColors`), the layout per column, the day row and hour grid colours, the legend, the work checkbox and draft, the settings default and the column editor.
- Integration tests use the new column ids (`all`, `recurring`, `work`, `other`); a weekly series lands in Powtarzalne, an event added from Praca lands there.
- Looked at in a 1600 x 2400 viewport against local events.
