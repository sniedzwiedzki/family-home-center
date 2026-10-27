# Lessons

Long-term memory for LLM agents working on this project. Read this file before starting any task.

Each entry below is a one-line summary linking to a detailed file in `.ai/lessons/`.

## Index

<!-- Newest first. Format: - [YYYY-MM-DD slug](lessons/YYYY-MM-DD-slug.md) — one-line takeaway -->
- [2026-10-27 hidden-preview-pane-has-no-frames](lessons/2026-10-27-hidden-preview-pane-has-no-frames.md) — a hidden browser pane runs no frames, so ResizeObserver never fires; check rAF first; bracket `var()` fallbacks inside calc
- [2026-10-27 shared-chip-widths-by-span](lessons/2026-10-27-shared-chip-widths-by-span.md) — a shared chip must reach every participant's column; test shared-chip changes with two and with three or more people
- [2026-10-26 agent-browser-click-needs-refs](lessons/2026-10-26-agent-browser-click-needs-refs.md) — a CSS text selector click can report success without doing anything; use the snapshot `@eN` ref workflow and verify with a screenshot
- [2026-10-20 recurrence-without-modelling-everything](lessons/2026-10-20-recurrence-without-modelling-everything.md) — parse only the rules the app writes, keep any other Google rule untouched; the rule lives on the master event
- [2026-10-19 model-may-duplicate-tool-calls](lessons/2026-10-19-model-may-duplicate-tool-calls.md) — guard mutating tools against repeated calls in the executor, not only in the prompt; silence timeout 3 s
- [2026-10-19 gemini-and-webview-voice](lessons/2026-10-19-gemini-and-webview-voice.md) — Fully's WebView has no Web Speech API: record with MediaRecorder and let Gemini (Interactions API) transcribe; lazy browser globals; fake mic in integration tests
- [2026-10-18 lazy-fetch-and-resettable-fakes](lessons/2026-10-18-lazy-fetch-and-resettable-fakes.md) — look fetch up lazily so tests can stub it; give stateful fake servers a reset; update events with get-then-PUT
- [2026-10-18 verify-google-claims-against-docs](lessons/2026-10-18-verify-google-claims-against-docs.md) — read vendor docs before documenting console flows or token behaviour; silent token renewal is not guaranteed
- [2026-10-17 local-chrome-without-root](lessons/2026-10-17-local-chrome-without-root.md) — run Chrome and take screenshots locally without root; don't push on every UI tweak
- [2026-10-17 ci-screenshots-and-agent-browser-quirks](lessons/2026-10-17-ci-screenshots-and-agent-browser-quirks.md) — review UI via CI screenshot artifact; agent-browser output quirks (trim text, `set viewport`)
