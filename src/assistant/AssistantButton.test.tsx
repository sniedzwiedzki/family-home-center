import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssistantButton } from './AssistantButton'

describe('AssistantButton', () => {
  it('is a labelled button that reports clicks', () => {
    const onOpen = vi.fn()
    render(<AssistantButton onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
