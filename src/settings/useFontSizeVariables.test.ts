import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_FONT_SIZES } from './fontSizes'
import { useFontSizeVariables } from './useFontSizeVariables'

const property = (name: string) => document.documentElement.style.getPropertyValue(name)

afterEach(() => {
  for (const name of ['--font-event-title-size', '--font-event-time-size', '--font-day-number-size']) document.documentElement.style.removeProperty(name)
})

describe('useFontSizeVariables', () => {
  it('sets the chosen sizes in rem on the root', () => {
    renderHook(() => useFontSizeVariables({ eventTitle: 24, eventTime: 12, dayNumber: 48 }))
    expect(property('--font-event-title-size')).toBe('1.5rem')
    expect(property('--font-event-time-size')).toBe('0.75rem')
    expect(property('--font-day-number-size')).toBe('3rem')
  })

  it('updates the properties when the sizes change', () => {
    const { rerender } = renderHook(({ sizes }) => useFontSizeVariables(sizes), { initialProps: { sizes: DEFAULT_FONT_SIZES } })
    rerender({ sizes: { ...DEFAULT_FONT_SIZES, eventTitle: 32 } })
    expect(property('--font-event-title-size')).toBe('2rem')
  })
})
