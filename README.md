# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more.

### Calendar

- Content is fetched from Google Calendar.
- Never-ending scroll page; each date is a single row.
- Application language: Polish (all UI text, dates and weather labels). The repository itself (code, docs, specs) stays in English.
- Clicking an event lets the user edit its date, time and content, or remove it.
- The settings button (in the top bar) opens the settings.

- Each date row shows the weather forecast for that day (only for days where a forecast is available).

### Top bar

- Sticky at the top of the view.
- Current time on the left, settings button on the right.

### Bottom bar

- Sticky at the bottom of the view.
- Weather forecast for the next 24h in 2h steps.
- The current time is always at the left; the bar automatically scrolls from right to left every 1h.

### Columns and family members

- The calendar has X columns, one per family member; family members are defined in settings.
- Each family member has a different color, definable in settings.
- Each family member has a unique tag; events are shown in the matching column based on that tag.
- The last column is fixed and shows "Other" events (those that match no family member tag).

### Settings

- Authorize with Google to grant access to the calendar.
- Define family members (name, unique tag, color).

## Target display

- 2400 x 1600 px tablet, no frames, Kiosk mode.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

Built with React + TypeScript + Vite.
