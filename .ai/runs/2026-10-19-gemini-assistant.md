# Run: Gemini voice assistant

Date: 2026-10-19
Spec: `.ai/specs/2026-10-19-gemini-voice-assistant.md`

## Goal

AI button in the top bar, modal that starts listening, spoken command sent to Gemini, README section on configuring Gemini and calendar access.

## Steps

1. Research: Fully Kiosk (Android WebView) has no Web Speech API, so record with `MediaRecorder` and send audio to Gemini. Read the current Gemini docs (Interactions API, function calling, audio formats).
2. Spec written.

## Decisions

See the spec.

3. `src/assistant/` built bottom-up: port, tool declarations and schemas, executor (reuses `eventDraft`), run loop, Gemini client, silence detector, voice recorder, hook, dialog.
4. Settings: `gemini` field (optional, so old stored settings still load), draft helpers, editor section. TopBar button, App wiring, `GEMINI_BASE_URL` build define.
5. Unit tests to 100% coverage; fake Gemini server and three integration tests with a scripted fake microphone.
6. README section "Gemini voice assistant"; spec moved to `implemented/`; lesson written.

## Files changed

New: `src/assistant/*` (with tests), `src/settings/GeminiSettingsEditor.tsx`, `src/settings/geminiDraft.ts` (with tests), `tests/integration/fake-gemini.ts`, spec, lesson, this log.
Changed: `src/App.tsx`, `src/App.css`, `src/shell/TopBar.tsx`, `src/shell/icons.tsx`, `src/settings/settings.ts`, `src/settings/SettingsForm.tsx`, `src/calendar/eventDraft.ts` (`parseDate` exported), `vite.config.ts`, `src/vite-env.d.ts`, tests, `tests/integration/*`, `README.md`.

## Verification

- `npm run lint` clean; `npm run build` ok; `npm test`: 550 tests, 100% statements/branches/functions/lines.
- `npm run test:integration` (local Chrome, 1600 x 2400): 17 tests pass. Screenshots `assistant-listening`, `assistant-answer`, `assistant-no-key` looked at: the mic button sits next to the settings button, the dialog shows the pulsing mic, the answer and the list of changes, and the event appears in Ola's column.

## Open issues

- A real Gemini call and a real microphone are not covered by automated tests.
