import { useEffect, useState } from 'react'

const CLOCK_STEP_MS = 60 * 1000

const floorToStep = (time: number): Date => new Date(time - (time % CLOCK_STEP_MS))

/** The current time, moving in steps of one minute: the now-line of the hour view. */
export function useClock(): Date {
  const [clock, setClock] = useState(() => floorToStep(Date.now()))

  useEffect(() => {
    const timer = window.setTimeout(
      () => setClock((current) => floorToStep(Math.max(current.getTime() + CLOCK_STEP_MS, Date.now()))),
      clock.getTime() + CLOCK_STEP_MS - Date.now(),
    )
    return () => window.clearTimeout(timer)
  }, [clock])

  return clock
}
