import { UserFacingError } from '../shared/userFacingError'
import type { RecordedAudio } from './assistant.port'
import { createSilenceDetector } from './silenceDetector'

/** Loudness (RMS, 0 to 1) of ordinary speech at tablet distance is well above 0.05; a quiet kitchen stays below it. */
const SPEECH_LEVEL = 0.05
/** Long enough for a pause to think in the middle of a sentence. */
const SILENCE_MS = 3000
const NO_SPEECH_MS = 8000
/** A command is a sentence; the cap keeps a stuck recording (and its upload) small. */
const MAX_RECORDING_MS = 30_000
const SAMPLE_MS = 100
const FFT_SIZE = 1024
const BYTE_CENTER = 128

export interface Recording {
  /** Ends the recording now and delivers what was said so far. */
  stop(): void
  /** Ends the recording and drops it, releasing the microphone. */
  cancel(): void
  /** The recording once it ends (stop, silence after speech, or the length cap); null when nobody spoke or it was cancelled. */
  result: Promise<RecordedAudio | null>
}

export interface VoiceRecorder {
  /** Asks for the microphone and starts recording. */
  start(): Promise<Recording>
}

interface VoiceRecorderDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  createRecorder: (stream: MediaStream) => MediaRecorder
  createAudioContext: () => AudioContext
  now: () => number
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function rms(samples: Uint8Array): number {
  const sum = samples.reduce((total, sample) => total + ((sample - BYTE_CENTER) / BYTE_CENTER) ** 2, 0)
  return Math.sqrt(sum / samples.length)
}

/** Records the microphone with MediaRecorder and ends the recording when the user stops talking. */
export function createVoiceRecorder({ getUserMedia, createRecorder, createAudioContext, now }: VoiceRecorderDeps): VoiceRecorder {
  return {
    start: async () => {
      let stream: MediaStream
      try {
        stream = await getUserMedia({ audio: true })
      } catch (error) {
        throw new UserFacingError('Nie udało się włączyć mikrofonu. Sprawdź, czy aplikacja ma do niego dostęp.', { cause: error })
      }

      const recorder = createRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      const audioContext = createAudioContext()
      void audioContext.resume()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      audioContext.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const detector = createSilenceDetector({ speechLevel: SPEECH_LEVEL, silenceMs: SILENCE_MS, noSpeechMs: NO_SPEECH_MS })

      let isDiscarded = false
      let isFinished = false
      let sampleTimer = 0
      let maxTimer = 0

      const result = new Promise<RecordedAudio | null>((resolve, reject) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop())
          void audioContext.close()
          if (isDiscarded || !detector.hasHeardSpeech()) {
            resolve(null)
            return
          }
          const type = recorder.mimeType || chunks[0]?.type || 'audio/webm'
          blobToBase64(new Blob(chunks, { type })).then(
            (base64) => resolve({ base64, mimeType: type.split(';')[0] }),
            (error: unknown) => reject(new UserFacingError('Nie udało się odczytać nagrania.', { cause: error })),
          )
        }
      })

      const finish = () => {
        if (isFinished) return
        isFinished = true
        window.clearInterval(sampleTimer)
        window.clearTimeout(maxTimer)
        recorder.stop()
      }

      sampleTimer = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples)
        if (detector.push(rms(samples), now()) !== 'listening') finish()
      }, SAMPLE_MS)
      maxTimer = window.setTimeout(finish, MAX_RECORDING_MS)
      recorder.start()

      return {
        stop: finish,
        cancel: () => {
          isDiscarded = true
          finish()
        },
        result,
      }
    },
  }
}
