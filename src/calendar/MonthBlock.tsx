import type { ReactNode } from 'react'
import { formatMonthLabel } from '../shared/format'

interface MonthBlockProps {
  monthKey: string
  firstDay: Date
  children: ReactNode
}

export function MonthBlock({ monthKey, firstDay, children }: MonthBlockProps) {
  return (
    <section className={firstDay.getMonth() % 2 === 0 ? 'month-block' : 'month-block is-alternate'} data-month={monthKey}>
      <h2 className="month-label">{formatMonthLabel(firstDay)}</h2>
      <div className="month-days">{children}</div>
    </section>
  )
}
