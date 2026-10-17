import { useCallback, useMemo, useState } from 'react'
import { addDays, daysInRange } from './days'

const INITIAL_DAYS_EACH_SIDE = 30
const EXTEND_BY_DAYS = 30

export function useDayWindow(anchor: Date) {
  const [before, setBefore] = useState(INITIAL_DAYS_EACH_SIDE)
  const [after, setAfter] = useState(INITIAL_DAYS_EACH_SIDE)

  const range = useMemo(
    () => ({ from: addDays(anchor, -before), to: addDays(anchor, after + 1) }),
    [anchor, before, after],
  )
  const days = useMemo(() => daysInRange(range.from, range.to), [range])
  const extendBefore = useCallback(() => setBefore((current) => current + EXTEND_BY_DAYS), [])
  const extendAfter = useCallback(() => setAfter((current) => current + EXTEND_BY_DAYS), [])

  return { range, days, before, extendBefore, extendAfter }
}
