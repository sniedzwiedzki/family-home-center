# Gemini voice assistant

Date: 2026-10-19
Status: implemented (a real Gemini call and microphone are still to be tried by hand on the tablet)

## Goal

An AI button in the top bar opens a dialog that starts listening at once. The spoken command is sent as audio to Google Gemini, which changes the family calendar through typed tools (list, create, update, delete events). The README explains what to configure so Gemini can reach the calendar.

## Decisions

- **No browser speech recognition.** Fully Kiosk Browser runs on Android WebView, which has no Web Speech API (Fully's own FAQ says so). The app records the microphone with `getUserMedia` + `MediaRecorder` and sends the recording to Gemini, which hears and understands it in one call.
- **Gemini API: Interactions API** (`POST {base}/v1beta/interactions`, key in the `x-goog-api-key` header; checked against ai.google.dev on 2026-10-19). Audio goes inline as `{ "type": "audio", "data": <base64>, "mime_type": "audio/webm" }` (WebM is on the supported list; the limit is 20 MB per request).
- **Stateless, nothing stored at Google**: every request sets `store: false` and carries the full history (`user_input`, the model's steps exactly as received, `function_result` steps).
- **Calendar access = the app's own `CalendarPort`.** Gemini never receives Google Calendar credentials. The model only names tools; the app executes them against the same port the calendar view uses (Google Calendar when connected, local storage otherwise). So "access to our calendar" is: connect Google Calendar in the settings (already built) and add the Gemini API key.
- **Settings**: `gemini: { apiKey, model } | null`. The model defaults to `gemini-3.8-flash` (a model id listed in the docs on the check date) and can be changed in settings because ids change.
- **Tools** (arguments validated with Zod, family tags checked against the configured members, dates and times are local `YYYY-MM-DD` / `HH:mm`):
  - `list_events(from, to)` returns events with ids; the executor remembers them, and only remembered ids can be updated or deleted.
  - `create_event(title, date, startTime?, endTime?, endDate?, allDay?, tags?, description?)`.
  - `update_event(eventId, ...changed fields)`.
  - `delete_event(eventId)` never deletes by itself: the dialog asks "Usunąć?" and deletes only after the user taps the confirmation (engineering standards, section 4).
- **Dialog flow**: opens, asks for the microphone, shows "Słucham…". Recording stops when the user stops speaking (silence after speech), on "Gotowe", or after the maximum length; no speech at all ends with a hint. Then "Myślę…", then the model's answer (Polish text) plus a list of what was done. Buttons: "Powiedz kolejne polecenie", "Zamknij". Closing the dialog releases the microphone.
- **Top bar**: the AI button sits on the right, next to the settings button (the clock keeps the center).
- **Errors** are Polish and shown in the dialog: no key, no microphone or permission denied, network, 400 (bad key or request), 401/403, 429, 5xx, unreadable answer, too many tool rounds.

## Structure (`src/assistant/`)

| File | Role |
|---|---|
| `assistant.port.ts` | `AssistantPort` / `AssistantSession`, `ToolCall`, `ToolResult`, `RecordedAudio` (vendor neutral) |
| `tools.ts` | tool declarations (JSON schema) and argument schemas |
| `toolExecutor.ts` | validates and runs a tool call against `CalendarPort`; delete returns a pending confirmation |
| `runAssistant.ts` | the model/tool loop (bounded rounds) |
| `geminiClient.ts` | the only place that calls `fetch` for Gemini |
| `silenceDetector.ts` | pure end-of-speech detection from loudness samples |
| `voiceRecorder.ts` | microphone recording behind a small interface |
| `useAssistant.ts` | dialog state machine |
| `AssistantDialog.tsx`, `assistant.css` | the modal |
| `src/settings/GeminiSettingsEditor.tsx`, `geminiDraft.ts` | the settings section |

## Out of scope

Speech output (TTS), wake word, streaming, recurring events from voice, editing a whole series.

## Verification

100% unit coverage; integration test that the button opens the dialog (with and without a key); `npm run lint`, `npm run build`. A real Gemini call and a real microphone cannot be exercised in CI: they are tried by hand on the tablet.
