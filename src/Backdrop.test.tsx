import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Backdrop from './Backdrop'

type FakeContext = ReturnType<typeof makeContext>

const PIXEL_BYTES = 4

function makeContext() {
  return {
    fillStyle: '',
    globalAlpha: 1,
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fill: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * PIXEL_BYTES)
      for (let i = 0; i < width * height; i++) data[i * PIXEL_BYTES + 3] = i % 2 === 0 ? 255 : 0
      return { data }
    }),
  }
}

interface Layout {
  width: number
  height: number
  copyRight: number | null
}

let contexts: FakeContext[]
let observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[]
let layout: Layout
let canvasContextAvailable: boolean
let offscreenContextAvailable: boolean

function mountScene() {
  document.body.innerHTML = layout.copyRight === null ? '' : '<div class="starter"><main></main></div>'
  return render(<Backdrop />)
}

beforeEach(() => {
  contexts = []
  observers = []
  layout = { width: 1200, height: 800, copyRight: 300 }
  canvasContextAvailable = true
  offscreenContextAvailable = true

  vi.stubGlobal('Path2D', class {})
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
      constructor(callback: () => void) {
        observers.push({ callback, disconnect: this.disconnect })
      }
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const isOffscreen = this.className === ''
    if (isOffscreen ? !offscreenContextAvailable : !canvasContextAvailable) return null
    const context = makeContext()
    contexts.push(context)
    return context as unknown as CanvasRenderingContext2D
  })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const rect = this.tagName === 'MAIN' ? { right: layout.copyRight } : { width: layout.width, height: layout.height }
    return rect as unknown as DOMRect
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true })
})

describe('Backdrop', () => {
  it('renders the decorative layers hidden from assistive tech', () => {
    const { container } = mountScene()
    const root = container.querySelector('.backdrop')
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('canvas.dune')).toBeTruthy()
    expect(container.querySelector('.vignette')).toBeTruthy()
    expect(container.querySelector('canvas.mark-field')).toBeTruthy()
  })

  it('draws the dune field and the mark when there is room beside the copy', () => {
    const { container } = mountScene()
    const dune = container.querySelector<HTMLCanvasElement>('canvas.dune')
    expect(dune?.width).toBe(1200)
    expect(dune?.height).toBe(800)
    const [duneContext, markContext, maskContext] = contexts
    expect(duneContext.fillRect).toHaveBeenCalled()
    expect(markContext.fillRect).toHaveBeenCalled()
    expect(maskContext.fill).toHaveBeenCalled()
  })

  it('skips the mark when the copy leaves too little room', () => {
    layout = { width: 400, height: 800, copyRight: 300 }
    mountScene()
    const [duneContext, markContext] = contexts
    expect(duneContext.fillRect).toHaveBeenCalled()
    expect(markContext.fillRect).not.toHaveBeenCalled()
    expect(contexts).toHaveLength(2)
  })

  it('skips the mark when the copy is not rendered', () => {
    layout = { width: 1200, height: 800, copyRight: null }
    mountScene()
    expect(contexts[1].fillRect).not.toHaveBeenCalled()
    expect(contexts).toHaveLength(2)
  })

  it('does not draw when a canvas context is unavailable', () => {
    canvasContextAvailable = false
    mountScene()
    expect(contexts).toHaveLength(0)
    expect(observers).toHaveLength(0)
  })

  it('skips the mark when the offscreen mask context is unavailable', () => {
    offscreenContextAvailable = false
    mountScene()
    expect(contexts).toHaveLength(2)
    expect(contexts[1].fillRect).not.toHaveBeenCalled()
  })

  it('falls back to a pixel ratio of 1', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true })
    mountScene()
    expect(contexts[0].setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0)
  })

  it('caps the pixel ratio at 2', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true })
    mountScene()
    expect(contexts[0].setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
  })

  it('redraws when the canvas is resized', () => {
    mountScene()
    const callsBefore = contexts[0].clearRect.mock.calls.length
    layout = { width: 900, height: 600, copyRight: 300 }
    observers[0].callback()
    expect(contexts[0].clearRect.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('draws on a zero-sized canvas without throwing', () => {
    layout = { width: 0, height: 0, copyRight: null }
    expect(() => mountScene()).not.toThrow()
  })

  it('stops observing on unmount', () => {
    const { unmount } = mountScene()
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })
})
