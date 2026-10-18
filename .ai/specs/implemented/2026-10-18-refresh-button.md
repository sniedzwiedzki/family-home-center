# Refresh button

Date: 2026-10-18
Status: implemented

## Requirement (from the user)

Say how often the data refreshes, and add a refresh button next to the settings button for refreshing on demand.

## Current intervals

Events: every 5 minutes and when the browser comes back online. Weather: every 30 minutes, a minute after a failure. The clock ticks every second.

## Decisions

- A button "Odśwież" (↻) sits left of the settings button in the top bar. Tapping it reloads the events and the weather forecast at once; the old data stays on screen until the new arrives, so nothing flickers.
- Implemented as a counter (`refreshSignal`) held in `App` and passed to `useCalendarEvents` and `useForecast`; a change makes each hook fetch again right away (events from scratch, as for a source change; the forecast restarts its timer).
- The icon spins for 0.8 s after a tap (a timer in the component, equal to the CSS animation length); there is no loading state, because the screen keeps the old data meanwhile.
