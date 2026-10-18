import { useEffect, useState } from 'react'
import type { Forecast, GeoLocation, WeatherPort } from './types'

const REFRESH_MS = 30 * 60 * 1000
const RETRY_MS = 60 * 1000

interface Loaded {
  location: GeoLocation
  forecast: Forecast
}

/**
 * Keeps the last good forecast on screen when a refresh fails and retries sooner than the normal refresh.
 * `refreshSignal` is a counter: every change fetches again right away, like a manual refresh.
 */
export function useForecast(port: WeatherPort, location: GeoLocation | null, refreshSignal = 0): Forecast | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (location === null) return
    let cancelled = false
    let timer: number | undefined

    const load = async () => {
      let delay = REFRESH_MS
      try {
        const forecast = await port.getForecast(location)
        if (cancelled) return
        setLoaded({ location, forecast })
      } catch (error) {
        if (cancelled) return
        console.error('Could not load the weather forecast', error)
        delay = RETRY_MS
      }
      timer = window.setTimeout(load, delay)
    }
    void load()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [port, location, refreshSignal])

  return loaded !== null && loaded.location === location ? loaded.forecast : null
}
