# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more. The first iteration covers the calendar, the top and bottom bars and the settings; the AI voice assistant, tasks, actions and home control come later. See `.ai/specs/2026-10-17-calendar-first-iteration.md`.

### Calendar

- Content is fetched from the Google calendars chosen in settings; new events go to the default calendar chosen in settings.
- Never-ending scroll page in both directions, starting at today; each date is a single row.
- All-day and multi-day events appear in the row of every day they cover.
- Application language: Polish (all UI text, dates and weather labels). The repository itself (code, docs, specs) stays in English.
- Clicking an empty spot of a day in a person's column opens a dialog to add an event; that person is preselected, and more people can be added or changed. Clicking an existing event opens the same dialog to edit its date, time and content, or to remove it (with a second tap to confirm). For recurring Google events the user will choose: this occurrence, this and following, or the whole series.
- Until the Google API key is available, events are stored only in the browser's local storage (key `fhc.events.v1`).
- The settings button (in the top bar) opens the settings.

- Each date row shows the weather forecast for that day (only for days where a forecast is available).

### Top bar

- Sticky at the top of the view.
- Current time in the center (bold), settings button on the right; the AI assistant button (planned) goes on the left.

### AI voice assistant (planned, after the first iteration)

- A button in the center of the top bar; the user clicks it and talks to it.
- Speech is transcribed and sent to a Google Gemini model through the Gemini API, using an API key configured in settings.
- The user gives instructions in natural language, e.g. "Add an event on date X for user Y". The model returns structured tool calls (create, update, delete event, with the family member tag) which the app executes against Google Calendar.

### Bottom bar

- Sticky at the bottom of the view.
- Weather forecast for the next 24h in 2h steps.
- The current time is always at the left; the bar automatically scrolls from right to left every 1h.

### Columns and family members

- The calendar has X columns, one per family member; family members are defined in settings.
- Each family member has a different color, definable in settings.
- Each family member has a unique tag; events are shown in the matching column based on that tag. The tag is stored in the event's hidden properties, and `#tag` in the event title is recognised too. An event with several tags is shown in every matching column.
- The last column is fixed and shows "Other" events (those that match no family member tag).

### Settings

- Authorize with Google to grant access to the calendar (browser-only sign-in; the kiosk shows a sign-in screen when the session expires).
- Choose which calendars are shown and which one receives new events.
- Weather location (city or coordinates); forecasts come from Open-Meteo.
- Settings are protected by a PIN.
- Define family members (name, unique tag, color).

## Google Calendar integration

The app reads and writes events through the Google Calendar API, signing in from the browser (Google Identity Services, token model). There is no backend and no client secret anywhere. Until this is built and configured the calendar works on events kept in the browser's local storage.

### What you need

| What | Where | Needed for |
|---|---|---|
| A Google account that owns or can edit the family calendars | Google Calendar | the data |
| A Google Cloud project | [console.cloud.google.com](https://console.cloud.google.com) | the API and the sign-in |
| The Google Calendar API enabled in that project | Cloud Console, APIs & Services, Library | any API call; without it calls fail with `403 accessNotConfigured` |
| An OAuth consent screen with the scopes below and your family accounts as test users | Cloud Console, Google Auth Platform (Branding, Audience, Data Access) | the Google sign-in popup |
| An OAuth client ID of type "Web application" with the kiosk's address as an authorized JavaScript origin | Cloud Console, Google Auth Platform, Clients | identifying the app to Google |
| The client ID in the app's build environment | `.env.local` for development, the build environment for the kiosk | the app knowing which client to use |
| A browser profile on the kiosk that stays signed in to Google and allows the sign-in popup | the kiosk device | silent token renewal |

### Step by step

1. **Create a project.** Cloud Console, project picker, New project (for example `family-home-center`).
2. **Enable the API.** APIs & Services, Library, search "Google Calendar API", Enable.
3. **Configure the consent screen** (menu names change over time; at the time of writing it is Google Auth Platform):
   - *Branding*: app name (for example "Family Home Center"), user support email, developer contact email.
   - *Audience*: choose **External** for ordinary Gmail accounts (Internal only exists for Google Workspace organisations). Keep the publishing status **Testing** and add every family member's Google account under **Test users** (up to 100). Accounts that are not listed get `access_denied`. While an external app is in Testing, Google may expire the grant after 7 days, and the sign-in screen then shows an "unverified app" warning that you click through. For a private family app you can move to "In production" without verification; the warning stays and the limit is 100 users.
   - *Data access*: add these scopes (the narrowest that cover the features):
     - `https://www.googleapis.com/auth/calendar.events` to read, create, change and delete events;
     - `https://www.googleapis.com/auth/calendar.calendarlist.readonly` to list the calendars so they can be picked in the settings.
4. **Create the OAuth client.** Clients, Create client, Application type **Web application**:
   - *Authorized JavaScript origins*: the exact origin (scheme, host and port, no path, no trailing slash) the app is served from. Typical values: `http://localhost:5173` (Vite dev server), `http://localhost:3000` (the preview command in `openmercato.toml`) and the kiosk's own origin. Sign-in needs HTTPS unless the host is `localhost`, so serve the kiosk build over HTTPS or from `http://localhost`.
   - *Authorized redirect URIs*: leave empty; the token flow uses a popup and no redirect.
   - Copy the **Client ID** (it ends with `.apps.googleusercontent.com`). Do not create or use a client secret; a browser app cannot keep one.
5. **Give the app the client ID.** Vite exposes variables that start with `VITE_` to the browser code and bakes them into the build:
   ```bash
   # .env.local (git-ignored through the *.local rule); for the kiosk set the same variable in the environment that runs `npm run build`
   VITE_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   ```
   A client ID is a public identifier, not a secret, but it still stays out of the repository; changing it needs a rebuild.
6. **Sign in from the app** (settings screen, planned): "Zaloguj z Google", then choose which calendars are shown and which one receives new events. The settings are protected by the PIN.
7. **Prepare the kiosk browser**: sign in to the Google account once in the browser profile the kiosk uses, allow popups and third-party cookies for `accounts.google.com`, and keep that profile.

### How it behaves

- The access token lasts about one hour. The app keeps it in memory only and asks Google for a new one silently before it expires, which works while the browser stays signed in to Google. If the silent renewal fails (signed out, grant expired), the kiosk shows a sign-in screen; the popup needs a tap, so someone has to touch the tablet.
- Events are read for the visible range of days from every calendar chosen in the settings; new and edited events go to the default calendar chosen there.
- The person of an event is stored in the event's private extended property `fhcTags` (comma separated tags); `#tag` in the title is read too. Other private properties are left untouched.
- Recurring events are expanded into single occurrences. Editing or deleting one asks whether it applies to this occurrence, this and the following, or the whole series.
- Google's default Calendar API quota is far above what a family kiosk uses; the app refreshes on a timer, not on every scroll.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Error 400: origin_mismatch` or `redirect_uri_mismatch` | the page's origin is not in the client's authorized JavaScript origins (check scheme, port, trailing slash) |
| `Error 403: access_denied` ("has not completed the Google verification process") | the account is not listed as a test user |
| `403 accessNotConfigured` or "Calendar API has not been used in project" | the Calendar API is not enabled in the project that owns the client ID |
| The sign-in popup never appears | the browser blocks popups, or the sign-in was not started by a tap |
| Sign-in works but the calendar is empty | no calendar is selected in the settings, or the visible range has no events |
| The kiosk asks to sign in again about once a week | the consent screen is in Testing; see step 3, or publish it as "In production" |

### Testing without Google

The Google client is not written yet. When it is, unit tests will mock it and the integration tests will run against a fake Calendar API, so no Google account or network is needed for `npm test` or `npm run test:integration`.

## Target display

- 1600 px wide x 2400 px tall (portrait) tablet, no frames, Kiosk mode. Five family member columns plus the fixed "Other" column must fit comfortably.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run test:integration
```

Configuration lives in `.env.local` (git-ignored); see Google Calendar integration for `VITE_GOOGLE_CLIENT_ID`.

Built with React + TypeScript + Vite.
