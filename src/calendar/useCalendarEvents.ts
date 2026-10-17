import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent, CalendarPort, DateRange } from './types'

function missingChunks(wanted: DateRange, loaded: DateRange | null): DateRange[] {
  if (loaded === null) return [wanted]
  const chunks: DateRange[] = []
  if (wanted.from < loaded.from) chunks.push({ from: wanted.from, to: loaded.from })
  if (wanted.to > loaded.to) chunks.push({ from: loaded.to, to: wanted.to })
  return chunks
}

export function useCalendarEvents(port: CalendarPort, range: DateRange) {
  const [events, setEvents] = useState<ReadonlyMap<string, CalendarEvent>>(new Map())
  const [hasError, setHasError] = useState(false)
  const loaded = useRef<DateRange | null>(null)
  const fromTime = range.from.getTime()
  const toTime = range.to.getTime()

  useEffect(() => {
    const wanted = { from: new Date(fromTime), to: new Date(toTime) }
    const chunks = missingChunks(wanted, loaded.current)
    let cancelled = false

    Promise.all(chunks.map((chunk) => port.listEvents(chunk)))
      .then((results) => {
        if (cancelled) return
        loaded.current = wanted
        setHasError(false)
        setEvents((current) => {
          const merged = new Map(current)
          for (const event of results.flat()) merged.set(event.id, event)
          return merged
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Could not load calendar events', error)
        setHasError(true)
      })

    return () => {
      cancelled = true
    }
  }, [port, fromTime, toTime])

  return { events: [...events.values()], hasError }
}
