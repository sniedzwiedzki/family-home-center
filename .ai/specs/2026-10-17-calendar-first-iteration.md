# Calendar first iteration

Date: 2026-10-17
Status: in progress (phases 1-3 and 6 done; 5 done on local storage, see `2026-10-17-event-editor.md`; 4 pending)

## Goal

A kiosk calendar for a 1600 x 2400 (portrait) tablet: endless scroll of day rows from Google Calendar, one column per family member plus a fixed "Other" column, weather in rows and in a bottom bar, a top bar with the clock and settings. Polish UI. Standards: `.ai/specs/implemented/2026-10-17-engineering-standards.md`; 100% unit coverage for new code.

## Scope

In: calendar, top bar, bottom bar, settings (Google login, calendars, family members, weather location, PIN), event edit/delete.
Out (later iterations): AI voice assistant (kept in README as planned), tasks, actions, home control, backend.

## Decisions (confirmed by the user)

| Topic | Decision |
|---|---|
| Google auth | Browser only (Google Identity Services token flow), no backend. The ~1h token is renewed silently while the Google session lasts; otherwise the kiosk shows a sign-in screen. |
| Calendars read | Chosen in settings (checkbox list of the account's calendars; all selected by default). |
| Calendar written | One default calendar chosen in settings receives new events. |
| Tag storage | Source of truth: event `extendedProperties.private` (`fhcTags`, comma-separated). `#tag` tokens in the title are also recognised so events can be tagged from a phone. |
| Several tags | The event is shown in every matching column. |
| No matching tag | Fixed last column "Inne". |
| Multi-day / all-day | Shown in the row of every day they cover, with a continuation marker. |
| Recurring events | Edit/delete asks: this occurrence / this and following / whole series. |
| Scrolling | Endless in both directions, starting at today. |
| Settings access | Protected by a PIN stored in settings. |
| Weather | Open-Meteo (no key); location (city or coordinates) set in settings. |
| Settings storage | `localStorage`, validated with a schema on load. |

## Assumptions (change on request)

- Google OAuth client id comes from `VITE_GOOGLE_CLIENT_ID` (a public identifier, not a secret). Scope: `calendar.events` + `calendar.readonly` (calendar list).
- The first-run PIN is created on first opening settings; the PIN is a convenience lock against children, not a security boundary (stored in `localStorage`).
- Event edit dialog: title, description, date, start/end time (all-day toggle) and delete. Time zone is the device's.
- Bottom bar: 12 slots at 2h step starting at the current hour; the strip shifts left by one hour (half a slot) at every full hour, the current time stays at the left edge.
- A day row shows a forecast only when Open-Meteo returns one (up to 16 days); no placeholder otherwise.
- Day rows are virtualised (windowed) so the endless list stays light on the tablet.

## Architecture

Concept folders (created when first used): `src/calendar`, `src/family`, `src/weather`, `src/settings`, `src/shell` (top/bottom bar, layout).

- Ports + clients: `CalendarPort` / `GoogleCalendarClient`, `WeatherPort` / `OpenMeteoClient`, `AuthPort` / `GoogleAuthClient`. Only clients call `fetch`; all responses are schema-validated.
- Pure helpers (unit-tested): day range generation, event-to-days expansion (multi-day), tag extraction (`extendedProperties` + `#tag`), event-to-column mapping, forecast slotting for bottom bar and day rows, Polish date/time formatting (`Intl`, `pl-PL`).
- Hooks: `useCalendarEvents` (range fetch + cache + refresh), `useForecast`, `useNow` (clock tick), `useSettings`, `useAuth`.
- Reliability: periodic refresh, last known data kept on error, retry with backoff, cleanup of timers.

## Phases

1. **Foundation**: settings schema + storage, family members model, tag/column mapping helpers, Polish formatting, layout shell (top bar with clock and settings button, bottom bar, 1600 x 2400 portrait kiosk CSS, remove starter template and `Backdrop`).
2. **Calendar view**: endless virtualised day rows, member columns + "Inne", multi-day expansion, today anchoring, mock calendar data behind `CalendarPort`.
3. **Weather**: Open-Meteo client, day-row forecasts, bottom-bar 24h strip with hourly shift.
4. **Google**: auth client (sign-in screen, silent renewal), calendar list, events read for the visible range.
5. **Editing**: event dialog (add/edit/delete, tag read/write) done on local storage; the recurring-scope choice comes with the Google client.
6. **Settings UI**: PIN lock, family members (name, tag, colour), weather location (city search or coordinates). Done. Google login/logout and calendar selection (read + default write) move to phase 4, where the Google client exists.

Each phase ships as its own PR with unit tests at 100% and an integration test (agent-browser) for the visible behaviour.

## Open items

- Google Cloud project, OAuth client id and consent screen are needed from the user before phase 4 can be verified against the real API.
