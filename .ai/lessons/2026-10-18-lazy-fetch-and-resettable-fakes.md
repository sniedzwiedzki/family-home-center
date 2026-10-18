# Look `fetch` up lazily, and give fake servers a reset

Date: 2026-10-18

## Lessons

- `fetch.bind(globalThis)` at module load captures the original `fetch`, so a test that later stubs the global (`vi.stubGlobal('fetch', ...)`) never sees the calls. Pass a wrapper that looks `fetch` up on every call (`(input, init) => fetch(input, init)`, as `appFetch` in `src/App.tsx`).
- The fake servers used by the integration tests keep state in memory (the fake Google server stores events). Tests then leak state into each other: an event created in one test showed up in the next. Give every stateful fake a reset endpoint (`POST /__reset` on the fake Google server) and call it in `beforeEach`.
- `events.patch` is not the way to change an event the app only partly knows: Google's documentation recommends get-then-update, which `PUT`s the whole resource back and so keeps attendees, reminders and other fields (`src/google/googleCalendar.ts`).
