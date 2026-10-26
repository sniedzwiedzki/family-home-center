import { useEffect } from 'react'
import { fontSizeRem, type FontSizes } from './fontSizes'

/** Applies the chosen sizes as CSS custom properties on the document root, so any element can read them without prop-drilling. */
export function useFontSizeVariables(sizes: FontSizes): void {
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--font-event-title-size', `${fontSizeRem(sizes.eventTitle)}rem`)
    root.setProperty('--font-event-time-size', `${fontSizeRem(sizes.eventTime)}rem`)
    root.setProperty('--font-day-number-size', `${fontSizeRem(sizes.dayNumber)}rem`)
  }, [sizes.eventTitle, sizes.eventTime, sizes.dayNumber])
}
