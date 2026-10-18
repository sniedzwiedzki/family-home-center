# Run: Google Calendar integration (refresh token)

Date: 2026-10-18
Spec: `.ai/specs/2026-10-18-google-calendar-refresh-token.md`
Branch: `google-calendar`

## Steps

1. Merged the outstanding docs PR (#7), then wrote the spec: path B (refresh token pasted into the settings, exchanged by the app through `oauth2.googleapis.com/token`), no popup, no backend, works on GitHub Pages or from local files.
2. Checked Google's documentation and live servers: token endpoint and Calendar API answer `Origin: null`, `http://localhost:<port>` and `https://sniedzwiedzki.github.io` with matching CORS headers (including the `PUT` preflight); `events.update` is documented as full-resource, get-then-update recommended; calendar list fields; OAuth Playground labels (seen on the live page).
3. `src/google/`: token provider (memory cache, renewal a minute early, one shared in-flight request, Polish errors), API wrapper, event mapping, `createGoogleCalendar` (list with pagination, create, get-then-PUT update, delete occurrence or series, 410 counts as deleted), calendar list and the connection check.
4. Port changes: `deleteEvent(event, scope)`, `recurringEventId`, `RecurrenceScope`; `useCalendarEvents` resets when the source changes, reloads every 5 minutes and when the browser goes online.
5. Settings: `google` credentials and `calendars.known` (older stored settings still load); Google section with "Sprawdź połączenie", calendar pick, "Odłącz Google"; event dialog explains recurring edits and offers occurrence or series deletes; Google errors are shown in Polish.
6. `App` picks Google when credentials are saved, local storage otherwise; URLs are build-time defines (`GOOGLE_TOKEN_URL`, `GOOGLE_CALENDAR_URL`) so integration tests use a local fake Google server.
7. README: full instruction (project, API, Auth platform, scopes, publishing, OAuth client, Playground, settings, troubleshooting, sources).

## Decisions

- Real keys are never used in automation: unit tests mock `fetch` with fake credentials; integration tests run against `tests/integration/fake-google.ts`.
- Editing a whole recurring series and "this and following" are not built (documented).
- Events in Google and in local storage are never mixed or migrated.

## Verification

- `npm run lint`, `npm run build`: pass. `npm test`: 100% statements, branches, functions and lines.
- `npm run test:integration` (local, 1600 x 2400): 10 tests pass, including Google read, add, edit and delete, the settings connection check and the revoked-token message.
- NOT verified: a real Google account. The Playground steps were checked for labels on the live page only up to the OAuth configuration panel; the authorization screens and the client secret display in the Cloud Console were not seen.

## Open issues

- First real-account test by the user; fix the README or the app from what it shows.
- Whether the Console displays a client secret for a "Web application" client (the README says it does; Google's page says secrets are not used for web apps in the browser-flow context).
