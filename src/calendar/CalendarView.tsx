import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '../family/familyMember'
import type { DayForecast, HourForecast } from '../weather/types'
import { buildColumns, OTHER_COLUMN_ID } from './columns'
import { ColumnHeaders } from './ColumnHeaders'
import { addDays, dayKey, groupDaysByMonth, groupEventsByDay, startOfDay } from './days'
import { isDayOver } from './dayHours'
import { DayRow } from './DayRow'
import { draftFromEvent, newDraft } from './eventDraft'
import { EventDialog } from './EventDialog'
import { TODAY_PIN_LABEL, type TodayPosition } from './todayPin'
import { MonthBlock } from './MonthBlock'
import type { CalendarEvent, CalendarEventInput, CalendarPort, RecurrenceScope } from './types'
import { useCalendarEvents } from './useCalendarEvents'
import { useClock } from './useClock'
import { useDayWindow } from './useDayWindow'
import { useToday } from './useToday'
import './calendar.css'

const PREFETCH_MARGIN = '1500px'
const PIN_TOLERANCE_PX = 4

interface CalendarViewProps {
  port: CalendarPort
  members: readonly FamilyMember[]
  forecasts: ReadonlyMap<string, DayForecast>
  hourForecasts: ReadonlyMap<number, HourForecast>
  /** A counter; every change reloads the events. */
  refreshSignal: number
}

/** The day the user expanded or collapsed (`null`: none expanded). It only holds on the day it was chosen. */
interface DayChoice {
  day: string | null
  madeOn: string
}

type Editor = { kind: 'new'; day: Date; columnId: string; hour?: number } | { kind: 'edit'; event: CalendarEvent }

export function CalendarView({ port, members, forecasts, hourForecasts, refreshSignal }: CalendarViewProps) {
  const [anchor] = useState(() => startOfDay(new Date()))
  const today = useToday()
  const now = useClock()
  const { range, days, before, extendBefore, extendAfter } = useDayWindow(anchor)
  const { events, hasError, reload } = useCalendarEvents(port, range, refreshSignal)
  const [editor, setEditor] = useState<Editor | null>(null)
  const columns = useMemo(() => buildColumns(members), [members])
  const entriesByDay = useMemo(() => groupEventsByDay(events), [events])
  const months = useMemo(() => groupDaysByMonth(days), [days])

  const containerRef = useRef<HTMLElement>(null)
  const topSentinel = useRef<HTMLDivElement>(null)
  const bottomSentinel = useRef<HTMLDivElement>(null)
  const topAnchor = useRef<{ element: Element; top: number } | null>(null)
  const [todayPosition, setTodayPosition] = useState<TodayPosition>('visible')
  const todayKey = dayKey(today)
  const [choice, setChoice] = useState<DayChoice | null>(null)
  const [homeTarget, setHomeTarget] = useState<{ day: string } | null>(null)
  // Today stays expanded until its hours and events are over, then the next day takes over.
  const defaultExpanded = isDayOver(now, entriesByDay.get(todayKey) ?? []) ? dayKey(addDays(today, 1)) : todayKey
  const expandedKey = choice !== null && choice.madeOn === todayKey ? choice.day : defaultExpanded

  useLayoutEffect(() => {
    containerRef.current!.querySelector(`[data-day="${dayKey(anchor)}"]`)!.scrollIntoView({ block: 'start' })
  }, [anchor])

  useLayoutEffect(() => {
    if (homeTarget === null) return
    containerRef.current!.querySelector(`.day-row[data-day="${homeTarget.day}"]`)!.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [homeTarget])

  useLayoutEffect(() => {
    if (topAnchor.current === null) return
    // Keep the row that was at the top where it was: robust even when days were also added at the bottom in the same render.
    const { element, top } = topAnchor.current
    containerRef.current!.scrollTop += element.getBoundingClientRect().top - top
    topAnchor.current = null
  }, [before])

  useEffect(() => {
    const container = containerRef.current!
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === topSentinel.current) {
            const dayRows = [...container.querySelectorAll('.day-row:not(.is-pinned)')]
            const headerBottom = container.querySelector('.column-headers')!.getBoundingClientRect().bottom
            const element = dayRows.find((row) => row.getBoundingClientRect().bottom > headerBottom) ?? dayRows[0]
            topAnchor.current = { element, top: element.getBoundingClientRect().top }
            extendBefore()
          } else {
            extendAfter()
          }
        }
      },
      { root: container, rootMargin: PREFETCH_MARGIN },
    )
    observer.observe(topSentinel.current!)
    observer.observe(bottomSentinel.current!)
    return () => observer.disconnect()
  }, [extendBefore, extendAfter])

  useEffect(() => {
    const container = containerRef.current!
    const updateTodayPosition = () => {
      const row = container.querySelector(`.day-row[data-day="${todayKey}"]`)!.getBoundingClientRect()
      const headerBottom = container.querySelector('.column-headers')!.getBoundingClientRect().bottom
      const areaBottom = container.getBoundingClientRect().bottom
      // Scroll events (not an IntersectionObserver) because a fast jump from above to below never crosses "visible".
      setTodayPosition(
        row.top < headerBottom - PIN_TOLERANCE_PX ? 'above' : row.bottom > areaBottom + PIN_TOLERANCE_PX ? 'below' : 'visible',
      )
    }
    updateTodayPosition()
    container.addEventListener('scroll', updateTodayPosition, { passive: true })
    return () => container.removeEventListener('scroll', updateTodayPosition)
  }, [todayKey, expandedKey])

  const scrollToToday = () =>
    containerRef.current!.querySelector(`.day-row[data-day="${todayKey}"]`)!.scrollIntoView({ block: 'start', behavior: 'smooth' })

  const toggleDay = (key: string) => setChoice({ day: expandedKey === key ? null : key, madeOn: todayKey })
  const goHome = () => {
    setChoice(null)
    setHomeTarget({ day: todayKey })
  }

  const closeEditor = () => setEditor(null)
  const saveEvent = async (current: Editor, input: CalendarEventInput) => {
    if (current.kind === 'new') await port.createEvent(input)
    else await port.updateEvent({ ...input, id: current.event.id })
    reload()
    closeEditor()
  }
  const deleteEvent = async (event: CalendarEvent, scope: RecurrenceScope) => {
    await port.deleteEvent(event, scope)
    reload()
    closeEditor()
  }

  const renderDay = (day: Date, pinned = false) => (
    <DayRow
      key={dayKey(day)}
      day={day}
      isToday={dayKey(day) === todayKey}
      pinned={pinned}
      columns={columns}
      members={members}
      entries={entriesByDay.get(dayKey(day)) ?? []}
      forecast={forecasts.get(dayKey(day))}
      expansion={pinned ? undefined : { expanded: dayKey(day) === expandedKey, now, hourForecasts, onToggle: () => toggleDay(dayKey(day)) }}
      onAddEvent={(addDay, columnId, hour) => setEditor({ kind: 'new', day: addDay, columnId, hour })}
      onEditEvent={(event) => setEditor({ kind: 'edit', event })}
    />
  )
  const pinnedToday = (placement: 'top' | 'bottom') => (
    <div className={`pin pin-${placement}`}>
      <div className="pin-inner" role="button" tabIndex={0} aria-label={TODAY_PIN_LABEL} onClick={scrollToToday}>
        {renderDay(today, true)}
      </div>
    </div>
  )

  const dialog = editor !== null && (
    <EventDialog
      key={editor.kind === 'new' ? `new-${dayKey(editor.day)}-${editor.columnId}` : editor.event.id}
      heading={editor.kind === 'new' ? 'Nowe wydarzenie' : 'Edytuj wydarzenie'}
      initial={
        editor.kind === 'new'
          ? newDraft(editor.day, editor.columnId === OTHER_COLUMN_ID ? [] : [editor.columnId], editor.hour)
          : draftFromEvent(editor.event, members)
      }
      members={members}
      existing={editor.kind === 'edit' ? editor.event : undefined}
      onSave={(input) => saveEvent(editor, input)}
      onDelete={editor.kind === 'edit' ? (scope) => deleteEvent(editor.event, scope) : undefined}
      onClose={closeEditor}
    />
  )

  return (
    <>
      <main className="calendar" ref={containerRef} style={{ '--column-count': columns.length } as React.CSSProperties}>
        <ColumnHeaders columns={columns} onHome={goHome} />
        {hasError && (
          <p className="calendar-error" role="alert">
            Nie udało się pobrać wydarzeń.
          </p>
        )}
        {todayPosition === 'above' && pinnedToday('top')}
        <div ref={topSentinel} />
        {months.map((month) => (
          <MonthBlock key={month.key} monthKey={month.key} firstDay={month.days[0]}>
            {month.days.map((day) => renderDay(day))}
          </MonthBlock>
        ))}
        <div ref={bottomSentinel} />
        {todayPosition === 'below' && pinnedToday('bottom')}
      </main>
      {dialog}
    </>
  )
}
