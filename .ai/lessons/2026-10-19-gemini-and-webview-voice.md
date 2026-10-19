# Voice input in Fully Kiosk and the Gemini API

Date: 2026-10-19

## What happened

The first idea for voice input was the browser's Web Speech API. Fully Kiosk Browser (Android WebView) does not support it (its own FAQ says so; checked with `curl` on fully-kiosk.com). The Gemini docs also changed shape: the primary endpoint is now the **Interactions API** (`/v1beta/interactions`, steps instead of `contents`), so examples remembered from `generateContent` would have been wrong.

## Rules

- On the kiosk, record with `getUserMedia` + `MediaRecorder` and let Gemini transcribe: audio/webm is on its supported list, no conversion needed.
- Read the current Gemini docs before writing request shapes (fetching the pages with `curl` and stripping tags works when WebSearch is denied). Stateless use needs the model's own steps sent back unchanged, so keep them as loose objects (`z.looseObject`).
- Look browser globals (`MediaRecorder`, `AudioContext`, `navigator.mediaDevices`) up lazily inside functions; at module load they do not exist in jsdom and may not exist in old WebViews.
- This repo's lint enables React-compiler rules: a function that calls `setState` and is called from an effect warns (`set-state-in-effect`); keep the async orchestration in a plain module function and pass `setState` in as a callback.
- Integration tests cannot have a real microphone: inject a scripted fake `getUserMedia`/`MediaRecorder`/`AudioContext` with `agent-browser eval` after the page loads, and a fake Gemini server (`tests/integration/fake-gemini.ts`) with CORS headers.
- Chrome libraries for local integration runs: see `2026-10-17-local-chrome-without-root.md` (set `LD_LIBRARY_PATH` and `AGENT_BROWSER_ARGS=--no-sandbox`).
