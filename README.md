# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more. The first iteration covers the calendar, the top and bottom bars and the settings; the AI voice assistant is built too; tasks, actions and home control come later. See `.ai/specs/2026-10-17-calendar-first-iteration.md`.

### Calendar

- Content is fetched from the Google calendars chosen in settings; new events go to the default calendar chosen in settings.
- Never-ending scroll page in both directions, starting at today; each date is a single row.
- One day at a time can be expanded into an hour view (7:00 to 20:00, more only when an event starts earlier or ends later), with events at their hours and a now-line that moves every minute; the hour grid starts half an hour before the first hour (6:30 for the usual 7:00) so the first hour is not cramped against the top. No day expands by itself: tapping a date expands or collapses that day, and that choice is forgotten once the next day begins. The home button above the dates collapses the expanded day (if any) and scrolls back to today. Clicking the hour grid starts a new event at the clicked hour (one hour long). In the compact day rows a long event title is cut after two lines with an ellipsis.
- All-day and multi-day events appear in the row of every day they cover.
- A special event (the event dialog has **Wydarzenie specjalne ★**, or the special tag typed in the title, `#star` by default) is shown with a gold star before its title. The special tag is set in the settings and must differ from the people's tags; a special event without a person's tag sits in "Inne" like any untagged event.
- An all-day event shows only its title (no "cały dzień" line); the following days of a multi-day event say "ciąg dalszy".
- An event with the tags of several people is drawn once, as one wide bar across their columns above the cells, when those people are neighbours in the column order; people separated by someone who does not take part keep their own chips. In the hour view of an expanded day, timed events are still drawn per person.
- Application language: Polish (all UI text, dates and weather labels). The repository itself (code, docs, specs) stays in English.
- Clicking an empty spot of a day in a person's column opens a dialog to add an event; that person is preselected, and more people can be added or changed. Clicking an existing event opens the same dialog to edit its date, time and content, or to remove it (with a second tap to confirm). With Google connected the dialog also has **Powtarzaj** (see Repeating events below). For a recurring Google event a switch at the top chooses what an edit changes (**To wystąpienie** or **Cała seria**), and deleting asks whether to delete the occurrence or the whole series.
- Events live in Google Calendar when Google is connected in the settings; otherwise they are kept only in the browser's local storage (key `fhc.events.v1`).
- The settings button (in the top bar) opens the settings.

- Each date row shows the weather forecast for that day (only for days where a forecast is available).
- **Refresh**: events reload every 5 minutes and when the internet comes back, the forecast every 30 minutes (a minute after a failure); the ↻ button on the left of the top bar does both on demand, and the screen keeps the old data until the new arrives.

### Top bar

- Sticky at the top of the view.
- Current time in the center (bold); the refresh button (↻) on the left and the settings button (⚙) on the right; the AI assistant button is a large quarter circle in the bottom-right corner of the screen, overlapping the bottom bar's weather forecast.
- The refresh button reloads the calendar events and the weather forecast right away; the icon spins briefly after a tap.

### AI voice assistant

- The large quarter-circle microphone button in the bottom-right corner of the screen opens a dialog that starts listening at once. Say a command in Polish, for example "Dodaj basen dla Oli w piątek o 17". Recording ends when you stop talking (or tap **Gotowe**).
- The recording is sent to a Google Gemini model through the Gemini API, with the API key from the settings. The model answers in Polish and changes the calendar through typed tools: list, create and update events (with the family member tags). Deleting never happens by itself: the dialog asks "Usunąć wydarzenie…?" and deletes only after you tap **Usuń**.
- See "Gemini voice assistant" below for what to configure.

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
- Gemini API key and model for the voice assistant.
- The special tag that marks an event with a gold star (default `star`; letters, digits, `_` or `-`, not the tag of a person).
- Font size for the event title, the event time and the day-of-month number, each typed separately as a number of pixels of the 1600 px kiosk display (8 to 120; defaults 20, 16 and 41).

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

- **Reading**: the visible range of days is read from every ticked calendar, expanded into single occurrences (`singleEvents=true`), and reloaded every 5 minutes, when the browser comes back online and when the ↻ button is pressed. A failure keeps the events on screen and shows "Nie udało się pobrać wydarzeń."
- **Writing**: new events go to the "Zapisuj tutaj" calendar. Editing reads the event, changes only title, description, time and people, and writes it back whole, so attendees, reminders and other fields set in Google stay untouched.
- **People**: stored in the event's private extended property `fhcTags` (comma separated tags); `#tag` in the title is read too.
- **Recurring events**: see Repeating events below. Deleting asks "Usuń to wystąpienie" or "Usuń całą serię". "This and following" is not built: do that in Google Calendar.
- **Without Google** ("Odłącz Google", or empty fields): events live in the browser's local storage again. Events in Google and events in local storage are never mixed or copied.
- **Time zone**: the device's.

### Repeating events

Available only with Google Calendar connected (events in the tablet's local storage cannot repeat, so the controls are hidden there).

- **Powtarzaj** in the event dialog (new or existing single event): *Nie powtarzaj*, *Co tydzień*, *Co tydzień w wybrane dni* (buttons Pn to Nd), *Co miesiąc tego dnia*, *Co rok tego dnia*, and an optional *Powtarzaj do dnia* (no end by default). The rule is saved as a Google `RRULE`; for a monthly event on the 29th to 31st, months without that day are skipped, as in Google Calendar.
- **Editing a repeating event**: the switch at the top of the dialog. *To wystąpienie* (default) changes only that day. *Cała seria* loads the rule, hides the date fields (the series keeps its first day) and applies title, description, people, times and rule to the whole series; switching *Nie powtarzaj* on removes the rule, so it becomes a single event. A series with a rule the app does not model (every 2 weeks, a count, several rules) says so and keeps its rule; other changes are still saved. Lines such as `EXDATE` (deleted occurrences) are kept.
- **Voice**: "Dodaj basen dla Oli w poniedziałki i środy o 17 do końca czerwca" creates a repeating event (`create_event` with `repeat`, `repeatDays`, `repeatUntil`). Without Google the assistant answers that repeating needs Google Calendar. Changing the repeat rule by voice is not built.
- **Not built**: intervals ("every 2 weeks"), counts, "this and following", moving the first day of a series.

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

## Gemini voice assistant

The assistant is a button in the top bar. It records a spoken command, sends the recording to Google Gemini, and applies what Gemini decides to your calendar.

**How it works.** The tablet records the microphone (`getUserMedia` + `MediaRecorder`, WebM audio) and sends the recording, together with today's date, the family members' names and tags and a short job description, to the Gemini **Interactions API** (`POST https://generativelanguage.googleapis.com/v1beta/interactions`, key in the `x-goog-api-key` header). Speech recognition happens inside Gemini; Fully Kiosk Browser's Android WebView has no Web Speech API, which is why the browser's own recognizer is not used. Every request sets `store: false` and carries the whole conversation, so nothing is kept at Google by the app's choice (Google's own handling of API traffic is described in its terms for the Gemini API and depends on your plan).

**How Gemini gets access to the calendar.** It does not get any access of its own. Gemini never sees your Google Calendar credentials. It can only ask the app to run four tools, and the app runs them against the same calendar the screen shows:

| Tool | What it does |
|---|---|
| `list_events(from, to)` | reads the events of those days (the model needs it to find an event's id) |
| `create_event(...)` | adds an event; `tags` must be tags of family members from the settings |
| `update_event(eventId, ...)` | changes the given fields of an event it has listed |
| `delete_event(eventId)` | only asks you to confirm; the app deletes after you tap **Usuń** |

All arguments are validated before use; unknown tags and ids the model has not listed are refused and reported back to it. For a recurring event, voice deletes only the one occurrence. So the assistant can read and change exactly what the app itself can.

### What you need

| What | Where |
|---|---|
| Google Calendar connected (otherwise the assistant works on the events kept in the tablet's browser) | Ustawienia, Google Calendar (see Google Calendar integration; the two Calendar scopes there are all the assistant needs) |
| A Gemini API key | [aistudio.google.com/apikey](https://aistudio.google.com/apikey), "Create API key" (a free tier exists; its limits and data-use terms differ from the paid one: read them on that page) |
| Family members with tags | Ustawienia, family members (the assistant tags events with these) |
| A microphone and its permission | Android: Fully Kiosk Browser, Settings, Web Content Settings, enable "Enable Webcam Access (Video and Audio)" / microphone access, and grant the microphone permission to the Fully app in Android's app settings |

### Step by step

1. Create the API key in Google AI Studio and copy it. Never commit it.
2. On the tablet open Ustawienia (PIN), section **Asystent AI (Gemini)**, paste the key into *Klucz API Gemini*. *Model Gemini* is pre-filled with `gemini-3.8-flash`; change it if Google retires that name (the current list: [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)). Click **Zapisz**.
3. Make sure Google Calendar is connected in the same settings if the events should go to your real calendar.
4. Tap the microphone button in the bottom-right corner. The first time Android may ask for the microphone: allow it. Say a command, for example:
   - "Dodaj dentystę dla Ani jutro o 15:30"
   - "Co mam w czwartek?"
   - "Przenieś basen na piątek"
   - "Usuń dentystę w środę" (the dialog asks before deleting)

### How it behaves

- **Listening** ends after 3 s of silence following speech, on **Gotowe**, or after 30 s. If nobody speaks for 8 s you get "Nie usłyszałem polecenia."
- The audio is sent to Google. Use the assistant only where that is acceptable for your household.
- **Failures** are shown in the dialog in Polish and the calendar is reloaded in case some changes were already made.

| Message in the app | Cause |
|---|---|
| Asystent potrzebuje klucza API Gemini. | no key in the settings |
| Nie udało się włączyć mikrofonu. | microphone permission denied or no microphone; in Fully, enable microphone access for web content; the page must be served over HTTPS or from localhost (GitHub Pages is HTTPS) |
| Gemini odrzuciło żądanie (400). | wrong key or model name |
| Gemini odmówiło dostępu (401/403). | key without access, or Gemini API not available for the account or region |
| Nie znaleziono modelu Gemini (404). | the model name does not exist (any more) |
| Przekroczono limit zapytań do Gemini (429). | free-tier limit reached; wait or use a paid key |
| Brak połączenia z Gemini. | no internet, or a filter blocks `generativelanguage.googleapis.com` |
| Asystent wykonał zbyt wiele kroków. | the model kept calling tools; try a simpler command |

### Tests

The automated tests never use a real key, microphone or Gemini: unit tests use fakes, and the integration test runs the real app in a browser with a scripted fake microphone against a local fake Gemini server (the recording arrives, a `create_event` call is applied to the fake Google Calendar, the answer is shown). **A real Gemini call and a real microphone on the tablet have not been tried yet**; the request shapes follow the Gemini API documentation read on 2026-10-19, so check the first real run and fix this file if Google's behaviour differs.

### Sources

- [Interactions API](https://ai.google.dev/gemini-api/docs/interactions) and its [reference](https://ai.google.dev/api/interactions-api): request body, `store`, `system_instruction`, steps (`user_input`, `function_call`, `function_result`, `model_output`).
- [Function calling](https://ai.google.dev/gemini-api/docs/function-calling): function declarations and the stateless flow (send the model's steps back unchanged).
- [Audio understanding](https://ai.google.dev/gemini-api/docs/audio): supported formats (WebM among them), inline data up to 20 MB per request.
- [API keys](https://ai.google.dev/gemini-api/docs/api-key) and [models](https://ai.google.dev/gemini-api/docs/models).
- [Fully Kiosk Browser](https://www.fully-kiosk.com/en/): the Web Speech API is not supported by Android WebView; microphone access for web content.

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

Configuration lives in `.env.local` (git-ignored); see Google Calendar integration for `VITE_GOOGLE_CLIENT_ID`. The Gemini API key is entered in the app's settings, not in a file.

Built with React + TypeScript + Vite.
