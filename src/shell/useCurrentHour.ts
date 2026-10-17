import { useEffect, useState } from 'react'
import { startOfHour } from '../weather/slots'

const HOUR_MS = 60 * 60 * 1000

export function useCurrentHour(): Date {
  const [hour, setHour] = useState(() => startOfHour(new Date()))

  useEffect(() => {
    const timer = window.setTimeout(
      () => setHour(new Date(Math.max(hour.getTime() + HOUR_MS, startOfHour(new Date()).getTime()))),
      hour.getTime() + HOUR_MS - Date.now(),
    )
    return () => window.clearTimeout(timer)
  }, [hour])

  return hour
}
