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
