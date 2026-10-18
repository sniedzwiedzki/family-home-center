import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths: the same build works under a sub-path (GitHub Pages, a local web server) and at the root.
  base: './',
  plugins: [react()],
  define: {
    // Overridable at build time so integration tests can point the app at a local fake weather, geocoding and Google API.
    __WEATHER_BASE_URL__: JSON.stringify(process.env.WEATHER_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast'),
    __GOOGLE_TOKEN_URL__: JSON.stringify(process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token'),
    __GOOGLE_CALENDAR_URL__: JSON.stringify(process.env.GOOGLE_CALENDAR_URL ?? 'https://www.googleapis.com/calendar/v3'),
    __GEOCODING_BASE_URL__: JSON.stringify(process.env.GEOCODING_BASE_URL ?? 'https://geocoding-api.open-meteo.com/v1/search'),
  },
})
