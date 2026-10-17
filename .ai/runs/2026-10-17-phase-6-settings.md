# Run: calendar phase 6 (settings UI)

Date: 2026-10-17
Spec: `.ai/specs/2026-10-17-calendar-first-iteration.md` (phase 6)
Branch: `phase-6-settings`

## Steps

1. `GeocodingPort` and `createOpenMeteoGeocoder` (city search, Polish results); `__GEOCODING_BASE_URL__` define, served by the fake server in integration tests.
2. Pure `memberErrors` mapping schema issues to Polish messages per field.
3. PIN components: `PinPad` (on-screen numeric keypad, 4-8 digits, no system keyboard needed), `PinEntry`, `PinCreate` (enter twice).
4. `SettingsDialog` (modal overlay; PIN gate, then form), `SettingsForm` (draft members and location, Save/Cancel, change PIN), `FamilyMembersEditor`, `WeatherLocationEditor` (city search + manual coordinates + remove).
5. Top bar settings button enabled; `App` opens/closes the dialog and persists settings.
6. Unit tests (100%) and a real-browser integration test of the whole flow (create PIN, add person, search location, save, reopen with wrong and right PIN).

## Decisions

- Members and location are edited as drafts and committed with "Zapisz"; the PIN is committed immediately when created or changed.
- The PIN is stored in `localStorage` as plain digits; it is a lock against children, not a security boundary. There is no attempt limit or auto-lock yet; closing the dialog re-locks it.
- Google sign-in and calendar selection are not part of this phase: they need the Google client from phase 4.
- A duplicate tag is reported on the later member only (schema behaviour).

## Verification

- `npm run lint`, `npm run build`: pass. `npm test`: 189 tests, 100% coverage.
- Real-browser flow runs in CI only (Chrome cannot run in the authoring sandbox).

## Open issues

- Visual review of the settings screen and keypad at 2400 x 1600 pending.
- Consider an inactivity timeout that closes an open settings dialog on the unattended kiosk.
