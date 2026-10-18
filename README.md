# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more. The first iteration covers the calendar, the top and bottom bars and the settings; the AI voice assistant, tasks, actions and home control come later. See `.ai/specs/2026-10-17-calendar-first-iteration.md`.

### Calendar

- Content is fetched from the Google calendars chosen in settings; new events go to the default calendar chosen in settings.
- Never-ending scroll page in both directions, starting at today; each date is a single row.
- All-day and multi-day events appear in the row of every day they cover.
- Application language: Polish (all UI text, dates and weather labels). The repository itself (code, docs, specs) stays in English.
- Clicking an empty spot of a day in a person's column opens a dialog to add an event; that person is preselected, and more people can be added or changed. Clicking an existing event opens the same dialog to edit its date, time and content, or to remove it (with a second tap to confirm). For recurring Google events an edit changes only that occurrence, and deleting asks whether to delete the occurrence or the whole series.
- Events live in Google Calendar when Google is connected in the settings; otherwise they are kept only in the browser's local storage (key `fhc.events.v1`).
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

- Connect Google Calendar with a client ID, client secret and refresh token (see Google Calendar integration); the app renews its access by itself.
- Choose which calendars are shown and which one receives new events.
- Weather location (city or coordinates); forecasts come from Open-Meteo.
- Settings are protected by a PIN.
- Define family members (name, unique tag, color).

## Google Calendar integration

When Google is connected, the calendar shows and changes events in your real Google calendars; without it, events are kept only in the tablet's browser (local storage).

**How it works.** You authorize your own Google account once, on a computer, and paste three values into the app's settings on the tablet: a client ID, a client secret and a **refresh token**. From then on the app trades the refresh token for a one-hour access token by itself (`POST https://oauth2.googleapis.com/token`), keeps that token in memory and gets a new one a minute before it expires. There is no sign-in popup, no Google script, no redirect and no backend, so nothing ever has to be renewed by a person, and it does not matter where the app is hosted (GitHub Pages, a local file, ...): Google's token endpoint and Calendar API accept requests from any web page (checked with `Origin` set to `null`, `http://localhost:<port>` and `https://sniedzwiedzki.github.io`).

**Security.** The client secret and the refresh token are stored in the browser's local storage on the tablet, in plain text. Anyone who can open that browser's developer tools can read them, and the refresh token gives access to the account's calendars (with the two scopes below, no other Google data). That is acceptable for a private kiosk. If the tablet is lost, revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions). Never commit these values.

### What you need

| What | Where |
|---|---|
| A Google account that owns or can edit the family calendars | Google Calendar |
| A Google Cloud project with the **Google Calendar API** enabled | [console.cloud.google.com](https://console.cloud.google.com), APIs & Services, Library |
| A configured **Google Auth platform** (app name, audience, your account as a test user, the two scopes) | Menu, Google Auth platform |
| Branding details (home page, privacy policy link, authorized domain) so the app can be published | Menu, Google Auth platform, Branding |
| An **OAuth client** of type "Web application" whose redirect URI is the OAuth Playground | Menu, Google Auth platform, Clients |
| The **refresh token** from the OAuth 2.0 Playground | [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground/) |
| The three values typed into the app | Ustawienia, Google Calendar |

### Step by step

Menu names come from Google's documentation and pages checked on 2026-10-18; the Cloud Console itself needs a login and was not opened. If a screen looks different, trust the screen and fix this file.

1. **Create a project.** Cloud Console, project picker, New project (for example `family-home-center`).
2. **Enable the API.** Menu, APIs & Services, Library, search "Google Calendar API", Enable.
3. **Set up the Google Auth platform.** Menu, Google Auth platform. If it says "Google Auth platform not configured yet", click **Get Started** and go through the wizard: App Information (app name, user support email), Audience (choose **External** for ordinary Gmail accounts), Contact Information (an email), Finish (agree to the User Data Policy, Continue, Create). The wizard does not ask for scopes: they are a separate step (point 5).
4. **Add yourself as a test user.** Menu, Google Auth platform, **Audience**, *Test users*, **Add users**, enter the Google account that owns the calendars, Save. Only listed accounts can authorize an app that is in Testing.
5. **Add the scopes.** Menu, Google Auth platform, **Data Access**, **Add or Remove Scopes**, tick these two and Save:
   - `https://www.googleapis.com/auth/calendar.events` (view and edit events on all your calendars);
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly` (see the list of calendars you are subscribed to).
6. **Publish the app, so the token does not expire after a week.** Google's rule: while the publishing status is *Testing*, authorizations by test users, and refresh tokens, expire seven days after consent, so the kiosk would stop after a week. To switch to production, the Console first requires the branding details (Publish app otherwise answers "Valid app name, support email, homepage URL and privacy policy URL are required for switching the app to external production mode"):
   1. Menu, Google Auth platform, **Branding**. Fill *App name* and *User support email* (from the wizard), and under *App domain*:
      - *Application home page*: `https://sniedzwiedzki.github.io/family-home-center/` (the app itself);
      - *Application privacy policy link*: `https://sniedzwiedzki.github.io/family-home-center/privacy.html` (a page that is part of this app and is published with it; open it once to see that it loads);
      - *Application terms of service link*: optional, leave empty.
   2. Under *Authorized domains* add `sniedzwiedzki.github.io` (Google: add the authorized domain before the links, and every domain used in the project must be listed there). *Developer contact information*: your email. Save.
   3. Menu, Google Auth platform, **Audience**, **Publish app**, confirm.

   Google's documentation says a homepage "hosted on a verified domain you own" and domain verification in Search Console are requirements for **verification** (which a private app does not need), not for publishing; whether the Console accepts `sniedzwiedzki.github.io` as an authorized domain without such verification has not been tested. In production Google shows an "unverified app" warning during authorization (the Calendar scopes are expected to be marked sensitive on the Data Access page), which you click through once; the cap for an unverified app is 100 users.
   **If the Console refuses this** (for example it rejects `github.io` as an authorized domain, or insists on domain verification), there are two ways out: stay in *Testing* and repeat point 8 every seven days (the app then shows "Token odświeżania wygasł lub został cofnięty." until you paste a new token), or give GitHub Pages your own domain, verify it in Search Console and use it in the branding fields.
7. **Create the OAuth client.** Menu, Google Auth platform, **Clients**, **Create Client**, Application type **Web application**, a name (for example `kiosk`). Under **Authorized redirect URIs** click Add URI and enter exactly `https://developers.google.com/oauthplayground` (the Playground needs it to receive the authorization). *Authorized JavaScript origins* can stay empty. Leave "Use this client for an AI-powered agent" off. Create, then copy the **Client ID** and the **Client secret** (the Console shows the secret for a Web application client; if yours shows none, the refresh in the app will answer `invalid_client`).
8. **Get the refresh token from the OAuth 2.0 Playground** ([developers.google.com/oauthplayground](https://developers.google.com/oauthplayground/)), on a computer:
   1. Click the gear icon (top right, "OAuth 2.0 configuration"). Tick **Use your own OAuth credentials** and paste the Client ID and the Client secret. Leave *Access type* on **Offline** and *Force prompt* on **Consent Screen** (the defaults). Close the panel.
   2. **Step 1, Select & authorize APIs**: in the box "Input your own scopes" type the two scopes from point 5 separated by a space, then click **Authorize APIs**.
   3. Choose the Google account, click through the "Google hasn't verified this app" screen if it appears (Advanced, then continue; wording may differ), tick both permissions and continue.
   4. **Step 2, Exchange authorization code for tokens**: click the button. The right-hand panel shows the response: copy the value of **`refresh_token`**.
9. **Enter it in the app** (on the tablet, or in any browser at the same address): Ustawienia (PIN), section **Google Calendar**, paste *Identyfikator klienta*, *Sekret klienta* and *Token odświeżania*, click **Sprawdź połączenie**. When it says "Połączono. Liczba kalendarzy: N." the calendars are listed: tick **Pokaż** for the ones to display and pick **Zapisuj tutaj** for the one that receives new events (only calendars you can edit can be picked). Click **Zapisz**.
10. **Check it**: today's Google events appear in the columns of the people whose tag they carry (or in "Inne"); add an event from the app and look for it in Google Calendar.

### How it behaves

- **Reading**: the visible range of days is read from every ticked calendar, expanded into single occurrences (`singleEvents=true`), and reloaded every 5 minutes and when the browser comes back online. A failure keeps the events on screen and shows "Nie udało się pobrać wydarzeń."
- **Writing**: new events go to the "Zapisuj tutaj" calendar. Editing reads the event, changes only title, description, time and people, and writes it back whole, so attendees, reminders and other fields set in Google stay untouched.
- **People**: stored in the event's private extended property `fhcTags` (comma separated tags); `#tag` in the title is read too.
- **Recurring events**: editing one changes only that occurrence. Deleting asks "Usuń to wystąpienie" or "Usuń całą serię". Editing a whole series, or "this and following", is not built: do that in Google Calendar.
- **Without Google** ("Odłącz Google", or empty fields): events live in the browser's local storage again. Events in Google and events in local storage are never mixed or copied.
- **Time zone**: the device's.

### When it stops working

The refresh token stops working when you revoke the app in your Google account, when it is unused for six months (the app uses it every few minutes), when more than 100 tokens were issued for the same account and client (the oldest dies), or, in Testing, after seven days. Changing the Google password does not invalidate it (that happens only with Gmail scopes). The app then says "Token odświeżania wygasł lub został cofnięty." Repeat point 8 and paste the new token in the settings.

| Message in the app | Cause |
|---|---|
| Token odświeżania wygasł lub został cofnięty. | revoked, expired (Testing: 7 days) or replaced token; or the client ID and secret differ from the ones used in the Playground |
| Nieprawidłowy identyfikator lub sekret klienta Google. | typo, or the client was deleted |
| Brak uprawnień (403). | the token was issued without the two scopes (redo point 8 with both), the Calendar API is not enabled, or the account cannot edit that calendar |
| Nie znaleziono kalendarza lub wydarzenia (404). | the calendar was removed or the event was deleted elsewhere (reload) |
| Brak połączenia z serwerami Google. | no internet, or a network filter blocks `googleapis.com` |
| Wybierz kalendarz do zapisu w ustawieniach. | no writable calendar is picked under "Zapisuj tutaj" |
| `access_denied` or "has not completed the Google verification process" in the Playground | the account is not a test user (point 4) |
| `redirect_uri_mismatch` in the Playground | the redirect URI of the client is not exactly `https://developers.google.com/oauthplayground` (point 7) |
| `Error 403: org_internal` or `admin_policy_enforced` | a Google Workspace administrator restricts the app; use a personal account |
| "Valid app name, support email, homepage URL and privacy policy URL are required..." when publishing | the Branding page is incomplete: fill the home page and privacy policy links and the authorized domain (point 6) |

### Tests

The automated tests never use a real Google account or key: unit tests mock `fetch` with fake credentials, and the integration tests run the real app against a local fake Google server (token endpoint and Calendar API). The real connection is tried by hand with the steps above.

### Sources

- [Configure the OAuth consent screen and choose scopes](https://developers.google.com/workspace/guides/configure-oauth-consent): Google Auth platform wizard, Audience, Data Access.
- [Create access credentials](https://developers.google.com/workspace/guides/create-credentials): Clients, Web application.
- [Choose Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth) (last updated 2026-09-03 by Google).
- [Publishing status and user cap](https://support.google.com/cloud/answer/15549945): Testing (100 test users, seven-day expiry) versus In production, unverified apps.
- [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server): refreshing an access token, `invalid_grant`, refresh token expiry rules.
- Calendar API reference: [events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [events.update](https://developers.google.com/workspace/calendar/api/v3/reference/events/update), [events.delete](https://developers.google.com/workspace/calendar/api/v3/reference/events/delete), [calendarList.list](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list).
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/): step names, "Input your own scopes", "Use your own OAuth credentials", Offline access type and Consent Screen prompt (seen on the live page).

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
