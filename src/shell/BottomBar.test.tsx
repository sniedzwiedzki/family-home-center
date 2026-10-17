import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BottomBar } from './BottomBar'

describe('BottomBar', () => {
  it('renders the forecast bar landmark', () => {
    render(<BottomBar />)
    expect(screen.getByLabelText('Prognoza pogody na 24 godziny')).toBeTruthy()
  })
})
