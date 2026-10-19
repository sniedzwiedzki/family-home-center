import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserFacingError } from '../shared/userFacingError'
import { createVoiceRecorder } from './voiceRecorder'

let level = 0
let recorderType = 'audio/webm;codecs=opus'
let chunkBytes = 3
let chunkType = 'audio/webm'
const stopTrack = vi.fn()
const closeContext = vi.fn(async () => undefined)
const recorders: FakeMediaRecorder[] = []

class FakeMediaRecorder {
  mimeType = recorderType
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(['x'.repeat(chunkBytes)], { type: chunkType }) })
    this.onstop?.()
  })
  stream: MediaStream
  constructor(stream: MediaStream) {
    this.stream = stream
    recorders.push(this)
  }
}

class FakeAnalyser {
  fftSize = 0
  getByteTimeDomainData(samples: Uint8Array) {
    samples.fill(128 + Math.round(level * 128))
  }
}

class FakeAudioContext {
  resume = vi.fn(async () => undefined)
  close = closeContext
  createAnalyser = () => new FakeAnalyser()
  createMediaStreamSource = () => ({ connect: vi.fn() })
}

const stream = { getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }] } as unknown as MediaStream
const getUserMedia = vi.fn(async () => stream)

const recorder = () =>
  createVoiceRecorder({
    getUserMedia,
    createRecorder: (media) => new FakeMediaRecorder(media) as unknown as MediaRecorder,
    createAudioContext: () => new FakeAudioContext() as unknown as AudioContext,
    now: Date.now,
  })

beforeEach(() => {
  vi.useFakeTimers()
  level = 0
  recorderType = 'audio/webm;codecs=opus'
  chunkBytes = 3
  chunkType = 'audio/webm'
  recorders.length = 0
  stopTrack.mockClear()
  closeContext.mockClear()
  getUserMedia.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('createVoiceRecorder', () => {
  it('asks for the microphone and starts recording', async () => {
    await recorder().start()
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(recorders[0].stream).toBe(stream)
    expect(recorders[0].start).toHaveBeenCalledTimes(1)
  })

  it('explains a missing or refused microphone', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const failure = await recorder().start().catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(UserFacingError)
    expect((failure as Error).message).toContain('mikrofon')
  })

  it('ends by itself after speech followed by silence, and delivers the recording', async () => {
    const recording = await recorder().start()
    level = 0.5
    await vi.advanceTimersByTimeAsync(500)
    level = 0
    await vi.advanceTimersByTimeAsync(2900)
    expect(recorders[0].stop).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(recorders[0].stop).toHaveBeenCalledTimes(1)
    expect(await recording.result).toEqual({ base64: 'eHh4', mimeType: 'audio/webm' })
    expect(stopTrack).toHaveBeenCalledTimes(2)
    expect(closeContext).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ends at once on stop() when something was said', async () => {
    const recording = await recorder().start()
    level = 0.5
    await vi.advanceTimersByTimeAsync(200)
    recording.stop()
    recording.stop()
    expect(recorders[0].stop).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(50)
    expect((await recording.result)?.mimeType).toBe('audio/webm')
  })

  it('delivers nothing when stopped before anybody spoke', async () => {
    const recording = await recorder().start()
    await vi.advanceTimersByTimeAsync(300)
    recording.stop()
    expect(await recording.result).toBeNull()
    expect(stopTrack).toHaveBeenCalled()
  })

  it('gives up when nobody speaks for eight seconds', async () => {
    const recording = await recorder().start()
    await vi.advanceTimersByTimeAsync(7900)
    expect(recorders[0].stop).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(await recording.result).toBeNull()
  })

  it('stops a recording that never goes quiet after thirty seconds', async () => {
    level = 0.5
    const recording = await recorder().start()
    await vi.advanceTimersByTimeAsync(29_900)
    expect(recorders[0].stop).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(await recording.result).not.toBeNull()
  })

  it('drops the recording and releases the microphone on cancel', async () => {
    const recording = await recorder().start()
    level = 0.5
    await vi.advanceTimersByTimeAsync(300)
    recording.cancel()
    expect(await recording.result).toBeNull()
    expect(stopTrack).toHaveBeenCalledTimes(2)
    expect(closeContext).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('takes the type from the data when the recorder does not know it, and falls back to WebM', async () => {
    recorderType = ''
    chunkType = 'audio/ogg;codecs=opus'
    let recording = await recorder().start()
    level = 0.5
    await vi.advanceTimersByTimeAsync(200)
    recording.stop()
    await vi.advanceTimersByTimeAsync(50)
    expect((await recording.result)?.mimeType).toBe('audio/ogg')

    chunkBytes = 0
    recording = await recorder().start()
    await vi.advanceTimersByTimeAsync(200)
    recording.stop()
    await vi.advanceTimersByTimeAsync(50)
    expect(await recording.result).toEqual({ base64: '', mimeType: 'audio/webm' })
  })

  it('reports a recording that cannot be read', async () => {
    class BrokenReader {
      error = new Error('boom')
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        this.onerror?.()
      }
    }
    vi.stubGlobal('FileReader', BrokenReader)
    const recording = await recorder().start()
    level = 0.5
    await vi.advanceTimersByTimeAsync(200)
    recording.stop()
    await expect(recording.result).rejects.toThrow('Nie udało się odczytać nagrania.')
  })
})
