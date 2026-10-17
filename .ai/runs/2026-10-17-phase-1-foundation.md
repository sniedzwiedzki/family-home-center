# Run: calendar phase 1 (foundation)

Date: 2026-10-17
Spec: `.ai/specs/2026-10-17-calendar-first-iteration.md` (phase 1)
Branch: `phase-1-foundation`

## Steps

1. Removed the starter template (`Backdrop`, starter `App`, assets, starter CSS) and the Backdrop tests.
2. Added `zod`; settings schema and `localStorage` storage (`src/settings`), family member schema with unique id/tag rules (`src/family`).
3. Added pure helpers: tag extraction from hidden event property and `#tag` in the title, event-to-column mapping with the fixed "Inne" column (`src/calendar`), Polish clock/day formatting (`src/shared`).
4. Added the kiosk shell: top bar (clock left, settings button right), bottom bar landmark, sticky column headers, kiosk CSS (`1rem` = 24 px at 2400 px width).
5. Rewrote unit tests; updated the integration test to the new screen.

## Decisions

- The settings button is rendered `disabled` until the settings screen lands in phase 6; the AI button is not rendered (assistant is a later iteration).
- The bottom bar is an empty landmark until phase 3 (forecast).
- Invalid or unreadable stored settings fall back to defaults (logged); a failing `localStorage` write keeps settings in memory.

## Verification

- `npm run lint`: clean. `npm run build`: passes (bundle 514 kB because of zod; Vite warns above 500 kB).
- `npm test`: 48 tests, 100% statements/branches/functions/lines.
- `npm run test:integration` and a visual check at 2400 x 1600: not possible in this sandbox (Chrome lacks system libraries); left to CI for the integration test.

## Open issues

- Visual layout is not yet reviewed in a browser; do it on the first PR preview or on the tablet.
- Consider `zod/mini` if the bundle size matters for the tablet.
