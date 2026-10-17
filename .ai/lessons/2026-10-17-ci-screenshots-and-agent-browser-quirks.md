# CI screenshots and agent-browser quirks

Date: 2026-10-17

## Context

The authoring sandbox cannot run Chrome (missing system libraries) and has no Docker, so UI work could not be looked at.

## Lessons

- The integration tests save 1600 x 2400 screenshots to `tests/integration/screenshots/`, and CI uploads them as the `integration-screenshots` artifact (also when tests fail). To review the UI: `gh run download <run-id> -n integration-screenshots -D /tmp/shots`, then read the PNGs. Do this for every visual change before reporting it done.
- `agent-browser get text <selector>` returns the text with a trailing newline; `trim()` it before matching with an anchored regex.
- `agent-browser` sets the viewport with `set viewport <w> <h>` (there is no top-level `viewport` command).
- `agent-browser eval` results are JSON on stdout; `JSON.parse(stdout.trim())` works for numbers, booleans and arrays.
- A `useEffect` that fetches must be given a stable dependency (e.g. a module-level port). Creating the port inline in a test's `renderHook` callback re-runs the effect on every render.
- The kiosk is a **1600 x 2400 portrait** tablet (width x height). Early UI work was checked at 2400 x 1600 landscape by mistake and had to be redone; the viewport in `tests/integration/app.int.test.ts` (`KIOSK_WIDTH`, `KIOSK_HEIGHT`) is the single place to keep right, and every UI change must be reviewed from screenshots taken at it.
- Endless-scroll windows must hold enough rows below the anchor to fill the screen: with compact rows the browser silently clamped `scrollIntoView`, and today no longer started at the top. After prepending rows, correct the scroll position from the position of a real row (`getBoundingClientRect().top` before and after), not from a `scrollHeight` difference, which also counts rows added elsewhere in the same render.

