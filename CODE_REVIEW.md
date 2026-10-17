# Code review

Review rules for Family Home Center (React + TypeScript + Vite kiosk app). `om-code-review` and `om-auto-review-pr` apply this file together with their built-in checklist. The detailed standards live in `.ai/specs/implemented/2026-10-17-engineering-standards.md`; this file is the review-time summary.

## Priorities

1. **Correctness** — the change does what the PR and its spec say; edge cases (empty, loading, error, offline, timezone/DST, day boundaries) are handled.
2. **Security** — secrets, untrusted input, AI assistant output (see below).
3. **Contracts** — see `BACKWARD_COMPATIBILITY.md` if the repository has one; otherwise persisted settings and external API usage are the surfaces to protect.
4. **Quality and tests** — structure, naming, test coverage.

## Repository-specific checks

### Structure
- Concept folders under `src/` (`calendar`, `family`, `weather`, `assistant`, `settings`) exist only when they contain files.
- Components render, hooks orchestrate, clients talk to the network, pure helpers hold logic. Pure helpers import neither React nor clients.
- Every external integration (Google Calendar, weather, Gemini) sits behind its own client/port; components never call `fetch` directly.
- Shared UI primitives and loading/error/empty states are reused, not rewritten per screen.

### Security
- Secrets (Google OAuth config, Gemini API key, weather key) come from environment variables or user settings; none are committed or logged. (blocker)
- All external data and all AI assistant output is validated with a schema before use. (blocker)
- The assistant acts only through typed tools (create, update, delete event); arguments are schema-validated, family member tags are resolved against configured members, and destructive actions need explicit user confirmation. (blocker)
- External text (event titles, descriptions) is rendered as plain text; no `dangerouslySetInnerHTML` with it. (blocker)
- Google OAuth scopes are the minimum needed; tokens never appear in logs or error messages. (blocker)
- New dependencies are justified; `npm audit` shows nothing new and serious.

### Kiosk reliability (unattended, runs for days)
- Timers, intervals, listeners and subscriptions are cleaned up on unmount. (major)
- Offline and API-failure states keep the last known data visible and retry with backoff. (major)
- The UI works on a 1600 x 2400 (portrait) display without keyboard or mouse; user-visible text is Polish.

### Code quality
- No `any`, `@ts-ignore` without a reason, empty `catch`, dead or commented-out code, debug `console.log`, or unexplained magic numbers.
- The diff traces entirely to the stated purpose: no drive-by renames or formatting passes mixed with behavior changes.
- Everything outside Polish UI text (code, comments, docs, commit messages) is in English.

### Tests
- New or changed code has unit tests with 100% statement, branch, function and line coverage (`npm test` enforces it). Coverage excludes and `v8 ignore` comments are not accepted; unreachable branches are removed instead. (blocker)
- A bug fix ships a regression test that fails without the fix. (major)
- User-visible behavior changes are covered by an integration test or verified in a real browser at the kiosk resolution, with evidence in the PR.

## Validation gate

The PR passes `npm run lint`, `npm test` and `npm run build`; CI also runs `npm run test:integration`. A red required check is a blocker finding, reported together with the code findings.

## Severity

- **Blocker** — security issue, data loss, broken build/gate, missing required tests or coverage, secret exposure.
- **Major** — correctness bug in a realistic scenario, kiosk reliability problem, contract change without a migration path.
- **Minor** — naming, small simplifications, style; deferred to a follow-up unless trivial.
