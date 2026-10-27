/**
 * Test helper. jsdom has no ResizeObserver and no layout: this one only records what is observed and reports widths a test
 * chooses. Tests install it with `vi.stubGlobal('ResizeObserver', FakeResizeObserver)`.
 */
export class FakeResizeObserver implements ResizeObserver {
  static instances: FakeResizeObserver[] = []
  readonly observed = new Set<Element>()
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.add(target)
  }

  unobserve(target: Element): void {
    this.observed.delete(target)
  }

  disconnect(): void {
    this.observed.clear()
  }

  /** Reports the given border-box widths, as the browser does after a layout. */
  resize(widths: ReadonlyMap<Element, number>): void {
    const entries = [...widths].map(([target, inlineSize]) => ({ target, borderBoxSize: [{ inlineSize, blockSize: 0 }] }) as unknown as ResizeObserverEntry)
    this.callback(entries, this)
  }
}
