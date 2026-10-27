# A hidden browser pane gets no rendering frames

Date: 2026-10-27

## What happened

A `ResizeObserver` in the calendar never fired in the Claude desktop app's browser pane. The ref callbacks attached and the code was right; the pane was hidden, so the page ran as a background page: `requestAnimationFrame` never ran (checked with a 1.5 s timeout) and resize observations, which are delivered with rendering frames, never came. `document.visibilityState` still said `visible`.

## Lesson

- Before debugging anything frame-driven (ResizeObserver, IntersectionObserver, requestAnimationFrame, CSS transitions) in that pane, check that a `requestAnimationFrame` callback runs.
- When it does not, check the layout another way: set the values the observer would set by hand from measured sizes, or ask the user to look in their own browser, which has frames.
- In CSS, `var(--x, a + b)` substitutes the fallback as plain text: write `calc((var(--x, a + b)) / 2)` with brackets.
