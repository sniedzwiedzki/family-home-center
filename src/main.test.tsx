import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const render = vi.fn()
const createRoot = vi.fn(() => ({ render }))

vi.mock('react-dom/client', () => ({ createRoot }))
vi.mock('./App.tsx', () => ({ default: () => null }))

describe('main', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('mounts the app into the root element', async () => {
    await import('./main.tsx')
    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(render).toHaveBeenCalledTimes(1)
  })
})
