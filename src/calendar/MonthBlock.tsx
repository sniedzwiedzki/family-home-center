import type { CSSProperties, ReactNode } from 'react'
import { formatMonthLabel } from '../shared/format'

// One pastel per calendar month, January first: ice, lavender, mint, spring green, blossom, sun, apricot, coral, wheat, autumn, mist, winter.
const MONTH_COLORS = [
  '#9fc5e8', '#b9a9de', '#a6d9bd', '#b7e0a0', '#f2b5d2', '#f8d56b',
  '#f6b36a', '#f29b90', '#dcb893', '#eda965', '#b7aed0', '#93bce0',
]

interface MonthBlockProps {
  monthKey: string
  firstDay: Date
  children: ReactNode
}

export function MonthBlock({ monthKey, firstDay, children }: MonthBlockProps) {
  return (
    <section className="month-block" data-month={monthKey} style={{ '--month-strip': MONTH_COLORS[firstDay.getMonth()] } as CSSProperties}>
      <h2 className="month-label">{formatMonthLabel(firstDay)}</h2>
      <div className="month-days">{children}</div>
    </section>
  )
}
