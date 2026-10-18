# Run: refresh button

Date: 2026-10-18
Spec: `.ai/specs/implemented/2026-10-18-refresh-button.md`

## Steps

1. Read the current intervals from the code (events 5 min and on `online`, weather 30 min / 1 min after a failure) to answer the user's question.
2. Added `refreshSignal` to `useCalendarEvents` and `useForecast`, `CalendarView` and `App`; the button and its spin in `TopBar`.
3. Tests: hooks react to a changed signal, the top bar button and spin timer, `App` passes an incrementing signal; an integration test adds an event to the fake Google server and shows it only after pressing the button.

## Notes

- `onAnimationEnd` does not fire in jsdom (React maps the event differently there), so the spin ends with a timer.

## Verification

- `npm run lint`, `npm run build`, `npm test` (371 tests, 100% coverage), `npm run test:integration` (12 tests, local, 1600 x 2400): pass. The screenshot shows the button next to the settings button and the refreshed event.
