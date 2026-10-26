# Kiosk UI and settings polish

Date: 2026-10-26
Status: implemented

## Requirement (from the user, translated from Polish)

New features and improvements:

1. Add the ability to change the font **size** in settings — separately for: event title, event time, and the day-of-month number. (Corrected after first implementation: the original request was misread as "font" meaning typeface; the user clarified they meant size, not family.)
2. Completely disable the automatic switching-on of the all-day (hour) view; keep only the manual toggle to expand a day's hour view.
3. Change the colours of the current day: keep the frame (can be even more distinct), but the day number colour and the background must be the same as for that day's kind (weekday, Saturday, Sunday).
4. Remove the background photo; leave the background fully white.
5. Increase the font size of the weather forecast text and icon in the bottom bar.
6. Move the voice-assistant button all the way to the bottom (so it overlaps the weather bar). Only the bottom weather bar may be changed, so its data does not hide under the button.

## Decisions

### 1. Per-element font **size** settings

- New `Settings.fontSizes` object: `{ eventTitle, eventTime, dayNumber }`, each a whole number of pixels of the 1600 px kiosk display (1rem = 16 px), 8 to 120. Defaults equal today's look: title 20, time 16, day number 41. Defined in `src/settings/fontSizes.ts`.
- `fontSizesSchema` validates the stored value; missing/old data gets the defaults, following the existing pattern for fields added after the first release (e.g. `gemini`).
- `FontSizeSettingsEditor` ("Rozmiar czcionki") follows the existing editors (`GeminiSettingsEditor`): a `settings-section` with a hint, `location-fields` and one labelled number `<input>` per element ("... (px)"), a `field-error` alert for invalid values. The form keeps a text draft (`FontSizesDraft`, like `GeminiDraft`) and disables **Zapisz** while a value is not a valid number in range.
- Chosen sizes are applied as CSS custom properties (`--font-event-title-size`, `--font-event-time-size`, `--font-day-number-size`, in rem) set on the document root by a small `useFontSizeVariables` hook; `.event-title`, `.event-time` and `.day-number` in `calendar.css` read them (the hour-grid title keeps its 0.9 ratio to the day-row title). This avoids prop-drilling through `CalendarView` → `DayRow` → `EventItem`; the typeface is untouched.

### 2. No automatic hour-view expansion

- `CalendarView` currently expands today by default, and switches to tomorrow once `isDayOver` says today's hours and events are behind `now`. That default is removed entirely: with no manual choice, no day is expanded.
- `isDayOver` becomes unused and is deleted (with its test) rather than kept as dead code.
- The manual toggle (clicking a date) and the "forgets the choice when the next day begins" behaviour stay, except the choice now reverts to "nothing expanded" instead of reverting to a computed default.
- The home button ("Wróć do widoku początkowego") still clears the choice and scrolls to today; it now returns to the fully-collapsed view instead of re-expanding today.

### 3. Today styled like its day kind, with only the frame distinguishing it

- `.day-row.is-today` currently overrides both `background` and adds a border, and `.is-today .day-number` overrides the number colour to `--primary`. Both overrides are removed so today falls back to the `--day-tint` / `--day-accent` already set per day kind (weekday/Saturday/Sunday via `--day-tint`/`--day-accent` custom properties).
- Only the inset border (`box-shadow`) stays, widened (2px → 3px) to read as more distinct now that the fill no longer carries the signal.

### 4. Flat white background

- `body`'s `background` (gradient veil + `var(--background)` + `url('./assets/tatry.jpg')`) becomes a plain `#ffffff`. The now-unused `--background` custom property, the image asset and its attribution file are deleted (no dead code/assets).

### 5. Bigger forecast text in the bottom bar

- `.slot-time`, `.slot-icon` and `.slot-temp` in `App.css` get larger `font-size` values.

### 6. Assistant button moved onto the weather bar

- `.assistant-corner-button` anchors to `bottom: 0` of `.bottom-area` instead of `bottom: 100%`, so it now overlaps the bottom bar instead of sitting flush above it. Its own size/shape is unchanged.
- `.bottom-bar` reserves right-hand padding equal to the button's footprint (base `1.25rem` + the button's `7.68rem` width) so the forecast strip's content never renders underneath the button.

## Non-goals

- No typeface/font-family choice — only size. No new font files/web-font loading either way (kiosk must stay usable offline).
- No change to which calendars/events are shown, to the Gemini assistant, or to recurrence.

## Testing

- Unit tests (Vitest, 100% coverage requirement): `fontSizes.ts`, `useFontSizeVariables`, `FontSizeSettingsEditor`, updated `settings.ts`/`SettingsForm` tests, rewritten `CalendarView` expansion tests (no default expansion, manual toggle, "forgets the choice" still reverts to nothing).
- `npm run lint`, `npm test`, `npm run build` must pass.
- UI changes (today's colours, white background, bigger forecast text, overlapping assistant button) checked locally with Chrome screenshots at the 1600×2400 kiosk viewport (see `.ai/lessons/2026-10-17-local-chrome-without-root.md`).
