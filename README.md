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

The app reads and writes events through the Google Calendar API, signing in from the browser with Google Identity Services (token model). There is no backend and no client secret anywhere. Until this is built and configured the calendar works on events kept in the browser's local storage.

Checked against Google's documentation on 2026-10-18 (sources at the end of this section). The Cloud Console menus are not browsable without signing in, so their names come from those documents; if a screen looks different, trust the screen and fix this file.

### What you need

| What | Where | Needed for |
|---|---|---|
| A Google account that owns or can edit the family calendars | Google Calendar | the data |
| A Google Cloud project | [console.cloud.google.com](https://console.cloud.google.com) | the API and the sign-in |
| The Google Calendar API enabled in that project | Menu, APIs & Services, Library | any API call; without it calls fail with `403 accessNotConfigured` |
| A configured Google Auth platform (branding, audience, test users, data access with the scopes below) | Menu, Google Auth platform | the Google sign-in popup |
| An OAuth client of type "Web application" with the kiosk's address as an authorized JavaScript origin | Menu, Google Auth platform, Clients | identifying the app to Google |
| The client ID in the app's build environment | `.env.local` for development, the build environment for the kiosk | the app knowing which client to use |
| A kiosk browser profile that is signed in to Google and allows the sign-in popup | the kiosk device | getting tokens |

### Step by step

1. **Create a project.** In the Cloud Console open the project picker and choose New project (for example `family-home-center`).
2. **Enable the API.** Menu, APIs & Services, Library, search "Google Calendar API", Enable.
3. **Set up the Google Auth platform.** Menu, Google Auth platform. If it says "Google Auth platform not configured yet", click **Get Started** and go through the wizard:
   1. *App Information*: app name (for example "Family Home Center") and a user support email.
   2. *Audience*: choose **External** for ordinary Gmail accounts. Internal only exists for Google Workspace organisations.
   3. *Contact Information*: an email address for notices about the project.
   4. *Finish*: agree to the Google API Services User Data Policy, click Continue, then Create.

   The wizard does **not** ask for scopes. After it finishes, the left menu has **Overview, Branding, Audience, Clients, Data Access** (and a verification page); the next two points use them.
4. **Add the family as test users.** Menu, Google Auth platform, **Audience**. The publishing status is **Testing**. Under *Test users* click **Add users** and enter every Google account that will sign in to the kiosk (up to 100). Accounts that are not listed cannot authorize the app. See "Testing versus production" below for what Testing means.
5. **Add the scopes.** Menu, Google Auth platform, **Data Access**, **Add or Remove Scopes**, tick the scopes below and Save. Choose the narrowest ones that cover the features:
   - `https://www.googleapis.com/auth/calendar.events`: view and edit events on all your calendars (read, create, change, delete; it also covers calendars shared with you, which `calendar.events.owned` would not);
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`: see the list of calendars you are subscribed to, to pick them in the app's settings.

   The Console marks which scopes are sensitive; Calendar scopes are expected to show that mark, which is why Google shows the "unverified app" warning. For a family app you click through it.
6. **Create the OAuth client.** Menu, Google Auth platform, **Clients**, **Create Client**, Application type **Web application**:
   - *Name*: anything (only you see it), for example `kiosk`.
   - *Authorized JavaScript origins*, Add URI: the exact origin (scheme, host and port, no path, no trailing slash) the app is served from. Typical values: `http://localhost:5173` (Vite dev server), `http://localhost:3000` (the preview command in `openmercato.toml`) and the kiosk's own origin. Sign-in needs HTTPS unless the host is `localhost`, so serve the kiosk build over HTTPS or from `http://localhost`.
   - *Authorized redirect URIs*: leave empty. Google says to use them for server-side apps; the browser popup flow does not need them.
   - Leave "Use this client for an AI-powered agent" off.
   - Click Create and copy the **Client ID** (it ends with `.apps.googleusercontent.com`). Google's documentation: client secrets are not used for Web applications, so there is nothing else to copy and nothing to hide in the bundle.
7. **Give the app the client ID.** Vite exposes variables that start with `VITE_` to the browser code and bakes them into the build:
   ```bash
   # .env.local (git-ignored through the *.local rule); for the kiosk set the same variable in the environment that runs `npm run build`
   VITE_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   ```
   A client ID is a public identifier, not a secret; changing it needs a rebuild.
8. **Sign in from the app** (the settings screen for this is not built yet): "Zaloguj z Google", then choose which calendars are shown and which one receives new events. The settings are protected by the PIN.
9. **Prepare the kiosk browser**: sign in to the Google account once in the browser profile the kiosk uses, allow popups for the app's address, and keep that profile.

### Testing versus production

Google's description of the publishing status:

- **Testing** (what you have after the wizard): at most 100 test users. **Authorizations by a test user expire seven days after the consent**, so the kiosk will ask for consent again about once a week. Google shows a warning before a test user can authorize the scopes.
- **In production** (the *Publish app* button on the Audience page): any Google account can authorize; because Calendar scopes are sensitive, the "unverified app" warning stays until Google verifies the app, and an unverified app can have at most 100 new users over the lifetime of the project. For a private family app that is enough, and it removes the weekly expiry. Verification is only needed for a public app.
- Accounts of a Google Workspace organisation may be blocked by the administrator's app-access policy (`admin_policy_enforced`), and accounts enrolled in Advanced Protection block most non-Google apps; use plain personal accounts for the kiosk if sign-in is refused.

### How it behaves, and the open question for an unattended kiosk

- The access token is short-lived (the response carries `expires_in`, about an hour). The app keeps it in memory only.
- **Renewal is the weak spot.** Google's documentation for the token model says a new token "must be obtained by calling `requestAccessToken()` from a user-driven event" when the old one expires. The `prompt: 'none'` option skips all sign-in and consent screens and may return a token without a tap when the account is signed in and has already consented, but the popup can be blocked when no tap triggered it, and Google does not promise it works. Whether it works on the kiosk's browser has to be tried there.
- If renewal fails, the kiosk shows a sign-in screen and someone has to tap it, possibly about every hour. If that is not acceptable, the alternative is a tiny backend that uses the authorization code flow (`initCodeClient`), keeps a refresh token and hands the browser fresh access tokens; it needs hosting and the app in production status (refresh tokens of test users expire after seven days too). This is an open decision recorded in `.ai/specs/2026-10-17-calendar-first-iteration.md`.
- Events are read for the visible range of days from every calendar chosen in the settings; new and edited events go to the default calendar chosen there.
- The person of an event is stored in the event's private extended property `fhcTags` (comma separated tags); `#tag` in the title is read too. Other private properties are left untouched.
- Recurring events are expanded into single occurrences. Editing or deleting one asks whether it applies to this occurrence, this and the following, or the whole series.
- The app refreshes events on a timer, not on every scroll; check the Calendar API quotas in the Console if you ever see `rateLimitExceeded`.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Error 400: origin_mismatch` | the page's origin is not in the client's authorized JavaScript origins (check scheme, port, trailing slash) |
| `Error 403: access_denied` ("has not completed the Google verification process") | the account is not a test user (Audience page) |
| `403 accessNotConfigured` or "Calendar API has not been used in project" | the Calendar API is not enabled in the project that owns the client ID |
| `admin_policy_enforced` | a Workspace administrator restricts the Calendar scopes; use another account |
| The consent screen does not list the Calendar scopes | the scopes were not added under Data Access |
| `popup_failed_to_open` or `popup_closed` | the browser blocked the popup, or it was closed; the sign-in has to start from a tap |
| Sign-in works but the calendar is empty | no calendar is selected in the settings, or the visible range has no events |
| The kiosk asks for consent again about once a week | the project is in Testing; see "Testing versus production" |

### Testing without Google

The Google client is not written yet. When it is, unit tests will mock it and the integration tests will run against a fake Calendar API, so no Google account or network is needed for `npm test` or `npm run test:integration`.

### Sources

- [Configure the OAuth consent screen and choose scopes](https://developers.google.com/workspace/guides/configure-oauth-consent): the wizard, Audience, test users, Data Access.
- [Create access credentials](https://developers.google.com/workspace/guides/create-credentials): Clients, Web application, authorized JavaScript origins, no client secret for web apps.
- [Choose Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth) (last updated 2026-09-03 by Google): the scope list and meanings.
- [Use the token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and the [JavaScript reference](https://developers.google.com/identity/oauth2/web/reference/js-reference): `requestAccessToken()`, user gesture, `prompt`, popup errors.
- [Publishing status and user cap](https://support.google.com/cloud/answer/15549945): Testing (100 users, 7-day expiry) versus In production, unverified apps.

## Target display

- 1600 px wide x 2400 px tall (portrait) tablet, no frames, Kiosk mode. Five family member columns plus the fixed "Other" column must fit comfortably.

## Deployment (GitHub Pages)

The app is a static bundle. Every push to `main` that passes CI is deployed by `.github/workflows/deploy.yml` to `https://sniedzwiedzki.github.io/family-home-center/`; the Fully Kiosk Browser on the tablet uses that address as its start URL, so updating the tablet means merging to `main` and reloading the page.

- **One-time setup, by hand**: repository Settings, Pages, Build and deployment, Source "GitHub Actions". Until this is switched on the deploy job fails. (The access token the AI agent works with is not allowed to change Pages settings.) The repository must stay public on the free plan.
- **Relative paths**: `vite.config.ts` sets `base: './'`, so the same build also works from any sub-path or local web server.
- **Manual run**: Actions, "Deploy to GitHub Pages", Run workflow (deploys the selected branch only if the environment allows it; by default only `main` can deploy).
- **Keep the address stable**: the app's settings, events and (later) the Google token live in the browser's local storage, which belongs to the address `https://sniedzwiedzki.github.io`. Another host or domain starts with empty settings.
- **Public site**: anyone with the address can open it; it contains no secrets (nothing personal is in the bundle).
- **Offline start**: after a restart without internet the tablet cannot load the page; a service worker cache would fix that and is not built yet.

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
