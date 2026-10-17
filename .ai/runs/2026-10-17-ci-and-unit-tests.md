# Run: CI setup and unit tests for existing code

Date: 2026-10-17
Spec: `.ai/specs/implemented/2026-10-17-ci-and-testing.md`

## Steps

1. Installed Vitest tooling (coverage-v8, jsdom, Testing Library), testcontainers, `@testcontainers/postgresql`, `pg`, `agent-browser`.
2. Added `vitest.config.ts` with `unit` and `integration` projects and 100% coverage thresholds.
3. Added integration harness (`tests/integration/global-setup.ts`, `app.int.test.ts`).
4. Added `.github/workflows/ci.yml`.
5. Wrote unit tests for `App`, `main` and `Backdrop`; removed the dead `hasPrev` branch in `Backdrop.tsx`.
6. Documented the 100% coverage rule and CI in `AGENTS.md`.

## Verification

- `npm run lint`: clean.
- `npm run build`: passes.
- `npm test`: 15 tests pass, 100% statements/branches/functions/lines.
- `npm run test:integration`: not runnable in this sandbox (no Docker; Chrome also lacks system libraries). Verified by CI only.

## Open issues

- Integration job is unverified until the first CI run.
