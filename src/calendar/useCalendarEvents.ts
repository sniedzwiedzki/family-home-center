import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEvent, CalendarPort, DateRange } from './types'

const REFRESH_MS = 5 * 60 * 1000

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
  const [version, setVersion] = useState(0)
  const loaded = useRef<DateRange | null>(null)
  const lastPort = useRef(port)
  const fromTime = range.from.getTime()
  const toTime = range.to.getTime()

  useEffect(() => {
    if (lastPort.current !== port) {
      // A different source (for example Google instead of local storage): what was loaded belongs to the old one.
      lastPort.current = port
      loaded.current = null
    }
    const wanted = { from: new Date(fromTime), to: new Date(toTime) }
    const isFullReload = loaded.current === null
    const chunks = missingChunks(wanted, loaded.current)
    let cancelled = false

    Promise.all(chunks.map((chunk) => port.listEvents(chunk)))
      .then((results) => {
        if (cancelled) return
        loaded.current = wanted
        setHasError(false)
        setEvents((current) => {
          const merged = new Map(isFullReload ? [] : current)
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
  }, [port, fromTime, toTime, version])

  /** Forgets everything loaded and fetches the visible range again, e.g. after an event was saved or deleted. */
  const reload = useCallback(() => {
    loaded.current = null
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MS)
    window.addEventListener('online', reload)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', reload)
    }
  }, [reload])

  return { events: [...events.values()], hasError, reload }
}
