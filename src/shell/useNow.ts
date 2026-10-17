import { useEffect, useState } from 'react'

const CLOCK_TICK_MS = 1000

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  return now
}
