# CI and testing

Date: 2026-10-17
Status: implemented

## Goal

Every pull request is checked for build, lint, unit tests and integration tests. New features require 100% unit test coverage.

## Decisions

- GitHub Actions workflow `.github/workflows/ci.yml` with four parallel jobs (build, lint, unit-tests, integration-tests), triggered on `pull_request` and pushes to `main`, Node 24.
- Unit tests: Vitest + jsdom + Testing Library, `src/**/*.test.{ts,tsx}`, v8 coverage with 100% thresholds on statements, branches, functions and lines. `npm test`.
- Integration tests: Vitest project `integration`, `tests/integration/*.int.test.ts`. Global setup starts PostgreSQL (`postgres:17-alpine`) with testcontainers, builds the app into `dist-integration` and serves it with `vite preview` on a free port; tests receive `appUrl` and `databaseUrl` through `inject`. The browser is driven with the `agent-browser` CLI in a per-process session. `npm run test:integration`; needs Docker.
- CI installs the browser with `agent-browser install --with-deps` and launches it with `--no-sandbox` (ephemeral runner).

## Notes

- The app has no backend yet, so the current integration tests only check that the database accepts connections and that the page renders. Extend them as features that use a database or a backend land.
- Removed the unreachable `hasPrev` branch from `Backdrop.tsx`: the first row lies in the overscan and is always off screen, so it could never be read.
