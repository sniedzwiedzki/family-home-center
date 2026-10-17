import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Overridable at build time so integration tests can point the app at a local fake weather and geocoding API.
    __WEATHER_BASE_URL__: JSON.stringify(process.env.WEATHER_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast'),
    __GEOCODING_BASE_URL__: JSON.stringify(process.env.GEOCODING_BASE_URL ?? 'https://geocoding-api.open-meteo.com/v1/search'),
  },
})
