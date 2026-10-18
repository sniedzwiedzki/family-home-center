# Google Calendar with a refresh token (no sign-in popup, no backend)

Date: 2026-10-18
Status: implemented; waiting for the first test with a real Google account (done by hand from the README)

## Requirement (from the user)

Connect the kiosk to Google Calendar so that nothing has to be renewed by a person. Credentials are stored in the app's local storage on the tablet; security is not a concern on that device. The app is hosted on GitHub Pages and shown by Fully Kiosk Browser. Real keys must never be used in automated tests.

## Decisions

- **Auth path B**: the user authorizes their own Google account once, outside the app (OAuth 2.0 Playground with their own client), and pastes three values into the settings: client ID, client secret, refresh token. The app then exchanges the refresh token for one-hour access tokens by calling `https://oauth2.googleapis.com/token` itself (`grant_type=refresh_token`); it keeps the access token in memory and renews it a minute before it expires. Google's token endpoint and the Calendar API answer browser requests with CORS headers (verified for `Origin: null` and `http://localhost:<port>`; the Pages origin is covered the same way), so no Google script, no popup and no redirect are involved.
- **Scopes** requested in the Playground: `calendar.events` and `calendar.calendarlist.readonly`.
- **Port**: a new `GoogleCalendar` implements `CalendarPort` (same interface as the local-storage calendar). When Google credentials are saved, the app uses it; without credentials it keeps using local storage.
- **Calendars**: "Sprawdź połączenie" in the settings lists the account's calendars (`users/me/calendarList`); the user ticks which to show and picks one to write to (only writable ones). Defaults: the calendars Google marks as selected; the primary calendar if writable, otherwise the first writable one. The list (id, name, writable) is stored so the settings screen can show names without a network call.
- **Event ids** carry the calendar: `<calendarId>|<googleEventId>`; recurring instances also carry `recurringEventId` in the same form.
- **Reading**: `events.list` per calendar with `singleEvents=true`, `orderBy=startTime`, `maxResults=2500`, following `nextPageToken`. All-day events use `date`, timed events `dateTime`.
- **Writing**: create is `events.insert` into the write calendar. Edit is `GET` the event, change the fields the app owns (title, description, start, end, the `fhcTags` private property) and `PUT` the whole resource, because Google's documentation recommends get-then-update for partial changes and this keeps attendees, reminders and other fields the app does not know. Editing a recurring event changes only that occurrence. Delete is `events.delete`; deleting a recurring event asks "this occurrence" or "the whole series" (delete on the series master); a `410 Gone` counts as deleted.
- **Refresh**: the visible range is reloaded every 5 minutes and when the browser comes back online; a failure keeps the old events and shows the existing error banner.
- **Errors** are shown in Polish: expired or revoked refresh token (`invalid_grant`), wrong client id or secret (`invalid_client`), missing permission (403), not found (404), Google unavailable, no connection.
- **Not supported yet**: editing a whole recurring series from the app (done in Google Calendar), "this and the following", attendees, reminders, colours.

## Testing

Unit tests mock `fetch` and use fake credentials; the integration test runs the real app against a local fake Google server (token endpoint and Calendar API) with fake credentials. No real key is ever used in automation; the real connection is tried by hand from the README instructions.
