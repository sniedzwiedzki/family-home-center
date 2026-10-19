import { describe, expect, it } from 'vitest'
import { createSilenceDetector } from './silenceDetector'

const options = { speechLevel: 0.1, silenceMs: 1000, noSpeechMs: 5000 }

describe('createSilenceDetector', () => {
  it('keeps listening while nobody has spoken yet', () => {
    const detector = createSilenceDetector(options)
    expect(detector.push(0.01, 0)).toBe('listening')
    expect(detector.push(0.01, 4999)).toBe('listening')
    expect(detector.hasHeardSpeech()).toBe(false)
  })

  it('gives up when nobody speaks for the whole waiting time', () => {
    const detector = createSilenceDetector(options)
    detector.push(0.01, 100)
    expect(detector.push(0.01, 5100)).toBe('no-speech')
  })

  it('counts the waiting time from the first sample', () => {
    const detector = createSilenceDetector(options)
    expect(detector.push(0.01, 1_000_000)).toBe('listening')
  })

  it('keeps listening while the user speaks', () => {
    const detector = createSilenceDetector(options)
    detector.push(0.5, 0)
    expect(detector.push(0.5, 900)).toBe('listening')
    expect(detector.hasHeardSpeech()).toBe(true)
  })

  it('ends the command after enough silence following speech', () => {
    const detector = createSilenceDetector(options)
    detector.push(0.5, 0)
    expect(detector.push(0.01, 999)).toBe('listening')
    expect(detector.push(0.01, 1000)).toBe('ended')
  })

  it('restarts the silence clock when speech continues', () => {
    const detector = createSilenceDetector(options)
    detector.push(0.5, 0)
    detector.push(0.01, 800)
    detector.push(0.5, 900)
    expect(detector.push(0.01, 1800)).toBe('listening')
    expect(detector.push(0.01, 1900)).toBe('ended')
  })

  it('never reports no-speech once speech was heard, however long the silence before it was', () => {
    const detector = createSilenceDetector(options)
    detector.push(0.01, 0)
    expect(detector.push(0.5, 4000)).toBe('listening')
  })
})
