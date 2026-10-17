# Engineering standards

Date: 2026-10-17
Status: implemented

Adapted from `.ai/docs/engineering-standards.md` (written for another project, DevMentor: a Next.js monorepo with a database and API). Only the principles that fit this project are kept: a single-package React + TypeScript + Vite app that talks to external APIs (Google Calendar, weather, Gemini) from the browser and has no backend or database of its own.

Not adopted from the source: package layers (`app/core/db/ui`), DI container, ORM, JWT/cookies/CSRF, rate limiting, `makeCrudRoute`/`CrudForm`/`DataTable`, concept-folder migration steps.

## 1. Structure and naming

| Element | Convention | Example |
|---|---|---|
| Domain concept folder | `src/<concept>/`, lowercase, singular-free kebab-case, created only when its first file is added | `src/calendar/`, `src/family/`, `src/weather/`, `src/assistant/`, `src/settings/` |
| React component | PascalCase file and default-free named export, one component per file | `EventRow.tsx` |
| Hook | `use` prefix, camelCase file | `useCalendarEvents.ts` |
| Pure logic / helpers | camelCase file, no React imports | `groupEventsByDate.ts` |
| External integration | an interface (port) in `src/<concept>/<name>.port.ts` and implementations next to it; callers depend on the port | `CalendarPort`, `GoogleCalendarClient`, `WeatherPort` |
| Zod/validation schema | camelCase + `Schema` suffix, one definition shared by every call site | `familyMemberSchema` |
| Constant | `SCREAMING_SNAKE_CASE`, with a comment when the value is not obvious | `FORECAST_STEP_HOURS` |
| Boolean | reads positively | `isLoading`, not `isNotReady` |

Rules:
- Create a concept folder only when its first file is added; never scaffold empty folders.
- A component used by one place lives next to it; promote it to a shared folder only when a second place needs it.
- Shared UI primitives (buttons, dialogs, loading/error/empty states) are defined once and reused; do not write per-screen spinners or error text.
- All HTTP calls to an external API go through one small client per integration (the only place that calls `fetch`), which parses responses defensively, returns typed results and handles errors. Components never call `fetch` directly.

## 2. Architecture

- Dependency direction: UI components -> hooks -> integration clients/ports -> pure helpers. Pure helpers import nothing from React or from clients.
- Separation of concerns: components render, hooks hold state and orchestration, clients talk to the network, helpers hold pure logic (date grouping, tag-to-column mapping, forecast slotting). Keep date/time logic pure and unit-testable.
- Depend on ports, not vendor SDKs: the assistant talks to an `AssistantPort`, so the model provider (Gemini by default) can change without touching callers.
- Explicit over implicit: no hidden globals; wire dependencies visibly.
- No speculative features: no RBAC, multi-tenant, queues or plugin systems unless a spec asks for them.
- Kiosk constraints: the app runs unattended on a 1600 x 2400 (portrait) tablet. It must survive network loss (show the last known data, retry with backoff), refresh data on its own, never leak timers or listeners, and not require keyboard or mouse.

## 3. Principles

- SRP: one file, one reason to change.
- DRY: one definition, many call sites. If you are about to copy a `try/catch` or a validation block, extract it.
- YAGNI, composition over inheritance, flat early-return code over deep nesting.
- When two principles conflict, prefer the one that keeps the change smaller and more explicit.

## 4. Security and validation

- Secrets (Google OAuth client config, Gemini API key, weather key) come from environment variables or user settings, are never committed and never logged. `.env*` stays git-ignored.
- Treat everything from outside as untrusted: API responses, stored settings and, above all, model output. Validate with a schema before use.
- The assistant may only act through a fixed set of typed tools (create, update, delete event). Validate every tool call's arguments with a schema, resolve family member tags against the configured members, and reject unknown ones. Never execute model output as code or build URLs/queries from it unvalidated.
- Destructive actions requested by the assistant (delete, bulk change) need explicit user confirmation in the UI.
- Request the minimum Google OAuth scopes needed for calendar read/write; store tokens as narrowly as the platform allows and never in logs or error messages.
- Render external text (event titles, descriptions) as plain text; never use `dangerouslySetInnerHTML` with it.
- Dependency hygiene: run `npm audit` as part of validation; do not add a dependency for something about 20 lines of local code covers.

## 5. Code quality

- No `any`; narrow `unknown` at runtime. No `@ts-ignore` without a stated reason.
- Self-documenting code; a comment only for a non-obvious why.
- No empty `catch`; handle, log with context, or rethrow.
- No magic numbers or strings; name them (and say why when the value is not obvious, e.g. a refresh interval).
- Remove dead code, commented-out code and debug `console.log` before finishing.
- A change's diff must trace entirely to its stated purpose: no drive-by renames or formatting passes mixed with behavior changes.
- All user-visible text is Polish; everything else in the repository is English (see `AGENTS.md`).

## 6. Review checklist

- [ ] Follows the structure and naming above; no unused folders or files.
- [ ] No component calls `fetch` directly; integrations sit behind their client/port.
- [ ] External data and model output are validated before use; secrets are not logged or committed.
- [ ] Assistant tool calls are schema-validated and destructive ones are confirmed.
- [ ] Errors, empty and offline states are handled and rendered with the shared components.
- [ ] Timers, listeners and subscriptions are cleaned up (kiosk runs for days).
- [ ] Behavior change ships with a test that fails on the old code; a bug fix ships a regression test.
- [ ] `npm run lint` and `npm run build` pass; UI changes were checked in the browser at 1600 x 2400 (portrait).

## 7. Follow-ups (done)

- `"strict": true` enabled in `tsconfig.app.json`.
- Vitest added; run with `npm test`. Test files are named `*.test.ts(x)` next to the code they test.
- There is no separate `npm run typecheck`; `npm run build` runs `tsc -b`, which covers it.
