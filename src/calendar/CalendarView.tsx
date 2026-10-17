import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '../family/familyMember'
import type { DayForecast } from '../weather/types'
import { buildColumns, OTHER_COLUMN_ID } from './columns'
import { ColumnHeaders } from './ColumnHeaders'
import { dayKey, groupDaysByMonth, groupEventsByDay, startOfDay } from './days'
import { DayRow } from './DayRow'
import { draftFromEvent, newDraft } from './eventDraft'
import { EventDialog } from './EventDialog'
import { TODAY_PIN_LABEL, type TodayPosition } from './todayPin'
import { MonthBlock } from './MonthBlock'
import type { CalendarEvent, CalendarEventInput, CalendarPort } from './types'
import { useCalendarEvents } from './useCalendarEvents'
import { useDayWindow } from './useDayWindow'
import { useToday } from './useToday'
import './calendar.css'

const PREFETCH_MARGIN = '1500px'
const PIN_TOLERANCE_PX = 4

interface CalendarViewProps {
  port: CalendarPort
  members: readonly FamilyMember[]
  forecasts: ReadonlyMap<string, DayForecast>
}

type Editor = { kind: 'new'; day: Date; columnId: string } | { kind: 'edit'; event: CalendarEvent }

export function CalendarView({ port, members, forecasts }: CalendarViewProps) {
  const [anchor] = useState(() => startOfDay(new Date()))
  const today = useToday()
  const { range, days, before, extendBefore, extendAfter } = useDayWindow(anchor)
  const { events, hasError, reload } = useCalendarEvents(port, range)
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

  useLayoutEffect(() => {
    containerRef.current!.querySelector(`[data-day="${dayKey(anchor)}"]`)!.scrollIntoView({ block: 'start' })
  }, [anchor])

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
  }, [todayKey])

  const scrollToToday = () =>
    containerRef.current!.querySelector(`.day-row[data-day="${todayKey}"]`)!.scrollIntoView({ block: 'start', behavior: 'smooth' })

  const closeEditor = () => setEditor(null)
  const saveEvent = async (current: Editor, input: CalendarEventInput) => {
    if (current.kind === 'new') await port.createEvent(input)
    else await port.updateEvent({ ...input, id: current.event.id })
    reload()
    closeEditor()
  }
  const deleteEvent = async (event: CalendarEvent) => {
    await port.deleteEvent(event.id)
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
      onAddEvent={(addDay, columnId) => setEditor({ kind: 'new', day: addDay, columnId })}
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
          ? newDraft(editor.day, editor.columnId === OTHER_COLUMN_ID ? [] : [editor.columnId])
          : draftFromEvent(editor.event, members)
      }
      members={members}
      existing={editor.kind === 'edit' ? editor.event : undefined}
      onSave={(input) => saveEvent(editor, input)}
      onDelete={editor.kind === 'edit' ? () => deleteEvent(editor.event) : undefined}
      onClose={closeEditor}
    />
  )

  return (
    <>
      <main className="calendar" ref={containerRef} style={{ '--column-count': columns.length } as React.CSSProperties}>
        <ColumnHeaders columns={columns} />
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
