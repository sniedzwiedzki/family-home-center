# Kiosk font sizes and top bar icons

## Goal
Make the kiosk easier to use on the 1600 x 2400 tablet: larger fonts, a larger event dialog, aligned top bar icons.

## Spec
Small visual tuning requested interactively, no spec needed.

## Steps
- Iterated on the UI locally with screenshots at 1600 x 2400, without committing (per AGENTS.md).
- Clock +2 px, day number +1 px, event time and title +3 px in total, bottom bar weather text and icon larger, current slot bold instead of coloured.
- Event dialog: bigger layout and fonts (+4 px in total).
- Refresh button moved to the left of the top bar; both top bar buttons became equal square buttons with SVG icons (Feather, MIT), because the text glyphs ↻ and ⚙ sat on different baselines.
- Day label column widened (84 to 108 px) so the temperature no longer overlaps the first event column; weather icon enlarged; day rows have one minimum height with and without weather (73 px).

## Decisions
- SVG icons instead of glyphs: the same size and baseline on every device and font.
- Row minimum height set to the height of a row with weather, so rows do not jump in height.

## Files changed
`src/App.css`, `src/calendar/calendar.css`, `src/calendar/eventDialog.css`, `src/shell/TopBar.tsx`, `src/shell/TopBar.test.tsx`, `src/shell/icons.tsx`, `src/assets/ATTRIBUTION.md`, `README.md`.

## Verification
`npm run lint`, `npm test` (371 tests, 100% coverage), `npm run build`, `npm run test:integration` (12 passed); local screenshots at 1600 x 2400 checked.

## Open issues
None.
