const LOCALE = 'pl-PL'

const clockFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
const dayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })

export const formatClock = (date: Date): string => clockFormat.format(date)

export const formatDayLabel = (date: Date): string => dayFormat.format(date)
