# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more. The first iteration covers the calendar, the top and bottom bars and the settings; the AI voice assistant, tasks, actions and home control come later. See `.ai/specs/2026-10-17-calendar-first-iteration.md`.

### Calendar

- Content is fetched from the Google calendars chosen in settings; new events go to the default calendar chosen in settings.
- Never-ending scroll page in both directions, starting at today; each date is a single row.
- All-day and multi-day events appear in the row of every day they cover.
- Application language: Polish (all UI text, dates and weather labels). The repository itself (code, docs, specs) stays in English.
- Clicking an event lets the user edit its date, time and content, or remove it. For recurring events the user chooses: this occurrence, this and following, or the whole series.
- The settings button (in the top bar) opens the settings.

- Each date row shows the weather forecast for that day (only for days where a forecast is available).

### Top bar

- Sticky at the top of the view.
- Current time on the left, AI assistant button in the center, settings button on the right.

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

## Target display

- 1600 px wide x 2400 px tall (portrait) tablet, no frames, Kiosk mode. Five family member columns plus the fixed "Other" column must fit comfortably.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

Built with React + TypeScript + Vite.
