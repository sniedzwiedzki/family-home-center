import { useCallback, useEffect, useRef, useState } from 'react'

type WidthRef = (element: HTMLElement | null) => void

/**
 * Watches the rendered widths of elements by key. Returns the latest widths and a ref callback per key; the callback is
 * the same on every render, so an element is observed once and not again after each re-render.
 */
export function useElementWidths(): [ReadonlyMap<string, number>, (key: string) => WidthRef] {
  const [widths, setWidths] = useState<ReadonlyMap<string, number>>(() => new Map())
  const observer = useRef<ResizeObserver | null>(null)
  const keyOf = useRef(new Map<Element, string>())
  const refs = useRef(new Map<string, WidthRef>())

  useEffect(() => () => observer.current?.disconnect(), [])

  const widthRef = useCallback((key: string): WidthRef => {
    const existing = refs.current.get(key)
    if (existing !== undefined) return existing

    let observed: HTMLElement | null = null
    const ref: WidthRef = (element) => {
      if (observed !== null) {
        observer.current!.unobserve(observed)
        keyOf.current.delete(observed)
      }
      observed = element
      if (element === null) return
      // Created on first use, so ResizeObserver is looked up only when something is measured (tests stub it).
      observer.current ??= new ResizeObserver((entries) =>
        setWidths((previous) => {
          const next = new Map(previous)
          for (const entry of entries) next.set(keyOf.current.get(entry.target)!, entry.borderBoxSize[0].inlineSize)
          return next
        }),
      )
      keyOf.current.set(element, key)
      observer.current.observe(element)
    }
    refs.current.set(key, ref)
    return ref
  }, [])

  return [widths, widthRef]
}
