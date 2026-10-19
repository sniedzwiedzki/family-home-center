# A model can issue the same create call twice

Date: 2026-10-19

## What happened

The first real run of the voice assistant added the event twice: once at the spoken hour and once as an all-day event. The app runs each tool call once, and two runs would have produced two identical timed events, so the model had sent two different `create_event` calls (with and without `startTime`). It could not be proven from the repo: the tablet's console was not available.

## Rules

- Do not rely on the model to call a mutating tool once. The executor refuses a second `create_event` with the same title and first day within one command and points the model at `update_event` (`src/assistant/toolExecutor.ts`); the system instruction says the same.
- When a field is optional and its absence changes the meaning (no `startTime` = all-day), say so in the instruction and the tool description.
- A pause to think mid-sentence lasts longer than 1.5 s; `SILENCE_MS` is 3 s.
