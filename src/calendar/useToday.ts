import { useEffect, useState } from 'react'
import { addDays, startOfDay } from './days'

export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()))

  useEffect(() => {
    const nextMidnight = addDays(today, 1)
    const timer = window.setTimeout(
      () => setToday(new Date(Math.max(nextMidnight.getTime(), startOfDay(new Date()).getTime()))),
      nextMidnight.getTime() - Date.now(),
    )
    return () => window.clearTimeout(timer)
  }, [today])

  return today
}
