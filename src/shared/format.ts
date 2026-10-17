const LOCALE = 'pl-PL'

const clockFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long' })

// Indexed by Date#getDay (0 = Sunday). Intl only offers "pon.", "czw." and similar, not the two-letter form.
const WEEKDAYS = ['nd', 'po', 'wt', 'śr', 'cz', 'pt', 'so']
const JANUARY = 0

export const formatClock = (date: Date): string => clockFormat.format(date)

export const formatWeekday = (date: Date): string => WEEKDAYS[date.getDay()]

/** Month name; January also carries the year so a long scroll stays unambiguous. */
export const formatMonthLabel = (date: Date): string =>
  date.getMonth() === JANUARY ? `${monthFormat.format(date)} ${date.getFullYear()}` : monthFormat.format(date)
