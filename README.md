# Family Home Center

Application for centralizing family events, calendar, tasks and home control.

## Main functionality

A big calendar with events, actions, tasks and more.

### Calendar

- Content is fetched from Google Calendar.
- Never-ending scroll page; each date is a single row.
- Language: Polish.
- Clicking an event lets the user edit its date, time and content, or remove it.
- A settings button opens the settings.

### Columns and family members

- The calendar has X columns, one per family member; family members are defined in settings.
- Each family member has a different color, definable in settings.
- Each family member has a unique tag; events are shown in the matching column based on that tag.
- The last column is fixed and shows "Other" events (those that match no family member tag).

### Settings

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
