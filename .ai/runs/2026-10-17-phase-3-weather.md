# Run: calendar phase 3 (weather)

Date: 2026-10-17
Spec: `.ai/specs/2026-10-17-calendar-first-iteration.md` (phase 3)
Branch: `phase-3-weather`

## Steps

1. Weather model and `WeatherPort`; `createOpenMeteoClient` (the only `fetch` call site for weather) with a zod-validated response, entries with missing essentials skipped.
2. WMO weather code to Polish label and icon (`weatherCodes.ts`).
3. `useForecast`: loads for the configured location, refreshes every 30 min, keeps the last forecast on failure and retries after 1 min; result is derived in render (no setState in effects).
4. Day rows show max/min temperature, icon and rain chance when a forecast exists for that day (`DayWeather`).
5. Bottom bar: 12 slots at 2h step from the current hour (`forecastSlots`), re-computed at every full hour (`useCurrentHour`) with a one-hour left shift animation.
6. Weather API base URL became a build-time define (`__WEATHER_BASE_URL__`, env `WEATHER_BASE_URL`); `vitest.config.ts` now merges `vite.config.ts`. Integration tests start a fake weather server and build the app against it.

## Decisions

- Open-Meteo times are treated as local time of the device (same zone as the location is assumed).
- The "scroll every hour" is a 1 s slide of the strip by half a slot when the hour changes, not a continuous scroll.
- Without a configured location the bottom bar says "Brak prognozy pogody" and rows show no weather. The location is set in the settings UI (phase 6); until then it can be put in `localStorage` key `fhc.settings.v1`.
- Forecast is not persisted; after a reload the bar is empty until the first response.

## Verification

- `npm run lint`, `npm run build`: pass. `npm test`: 139 tests, 100% coverage.
- Production bundle contains `https://api.open-meteo.com/v1/forecast`.
- Real-browser checks run only in CI (integration test with the fake weather server); Chrome cannot run in the authoring sandbox.

## Open issues

- Visual review of the bottom bar at 2400 x 1600 pending.
