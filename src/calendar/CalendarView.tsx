import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FamilyMember } from '../family/familyMember'
import type { DayForecast } from '../weather/types'
import { buildColumns } from './columns'
import { ColumnHeaders } from './ColumnHeaders'
import { dayKey, groupDaysByMonth, groupEventsByDay, startOfDay } from './days'
import { DayRow } from './DayRow'
import { TODAY_PIN_LABEL, type TodayPosition } from './todayPin'
import { MonthBlock } from './MonthBlock'
import type { CalendarPort } from './types'
import { useCalendarEvents } from './useCalendarEvents'
import { useDayWindow } from './useDayWindow'
import { useToday } from './useToday'
import './calendar.css'

const PREFETCH_MARGIN = '1500px'

interface CalendarViewProps {
  port: CalendarPort
  members: readonly FamilyMember[]
  forecasts: ReadonlyMap<string, DayForecast>
}

export function CalendarView({ port, members, forecasts }: CalendarViewProps) {
  const [anchor] = useState(() => startOfDay(new Date()))
  const today = useToday()
  const { range, days, before, extendBefore, extendAfter } = useDayWindow(anchor)
  const { events, hasError } = useCalendarEvents(port, range)
  const columns = useMemo(() => buildColumns(members), [members])
  const entriesByDay = useMemo(() => groupEventsByDay(events), [events])
  const months = useMemo(() => groupDaysByMonth(days), [days])

  const containerRef = useRef<HTMLElement>(null)
  const topSentinel = useRef<HTMLDivElement>(null)
  const bottomSentinel = useRef<HTMLDivElement>(null)
  const heightBeforePrepend = useRef<number | null>(null)
  const [todayPosition, setTodayPosition] = useState<TodayPosition>('visible')
  const todayKey = dayKey(today)

  useLayoutEffect(() => {
    containerRef.current!.querySelector(`[data-day="${dayKey(anchor)}"]`)!.scrollIntoView({ block: 'start' })
  }, [anchor])

  useLayoutEffect(() => {
    if (heightBeforePrepend.current === null) return
    const container = containerRef.current!
    container.scrollTop += container.scrollHeight - heightBeforePrepend.current
    heightBeforePrepend.current = null
  }, [before])

  useEffect(() => {
    const container = containerRef.current!
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (entry.target === topSentinel.current) {
            heightBeforePrepend.current = container.scrollHeight
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
    const headerHeight = container.querySelector('.column-headers')!.getBoundingClientRect().height
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 1) setTodayPosition('visible')
        else setTodayPosition(entry.boundingClientRect.top < entry.rootBounds!.top ? 'above' : 'below')
      },
      { root: container, rootMargin: `-${headerHeight}px 0px 0px 0px`, threshold: 1 },
    )
    observer.observe(container.querySelector(`.day-row[data-day="${todayKey}"]`)!)
    return () => observer.disconnect()
  }, [todayKey])

  const scrollToToday = () =>
    containerRef.current!.querySelector(`.day-row[data-day="${todayKey}"]`)!.scrollIntoView({ block: 'start', behavior: 'smooth' })

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
    />
  )
  const pinnedToday = (placement: 'top' | 'bottom') => (
    <div className={`pin pin-${placement}`}>
      <div className="pin-inner" role="button" tabIndex={0} aria-label={TODAY_PIN_LABEL} onClick={scrollToToday}>
        {renderDay(today, true)}
      </div>
    </div>
  )

  return (
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
  )
}
