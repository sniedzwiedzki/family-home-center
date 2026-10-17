import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./Backdrop', () => ({ default: () => <div data-testid='backdrop' /> }))

describe('App', () => {
  it('renders the backdrop and the headline', () => {
    render(<App />)
    expect(screen.getByTestId('backdrop')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Your React app is ready.')
  })

  it('shows the running status', () => {
    render(<App />)
    expect(screen.getByText('Running')).toBeTruthy()
  })

  it('lists the technology stack', () => {
    render(<App />)
    const items = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(items).toEqual(['React', 'TypeScript', 'Vite', 'Hot reload', 'Port 3000'])
  })
})
