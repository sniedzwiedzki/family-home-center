export type SpeechVerdict = 'listening' | 'ended' | 'no-speech'

interface SilenceDetectorOptions {
  /** Loudness (0 to 1) from which a sample counts as speech. */
  speechLevel: number
  /** How long it must be quiet after speech for the command to count as finished. */
  silenceMs: number
  /** How long to wait for the first word before giving up. */
  noSpeechMs: number
}

export interface SilenceDetector {
  push(level: number, nowMs: number): SpeechVerdict
  hasHeardSpeech(): boolean
}

/** Decides from loudness samples when the user has finished speaking. */
export function createSilenceDetector({ speechLevel, silenceMs, noSpeechMs }: SilenceDetectorOptions): SilenceDetector {
  let startedAt: number | null = null
  let lastSpeechAt: number | null = null

  return {
    push: (level, nowMs) => {
      startedAt ??= nowMs
      if (level >= speechLevel) lastSpeechAt = nowMs
      if (lastSpeechAt === null) return nowMs - startedAt >= noSpeechMs ? 'no-speech' : 'listening'
      return nowMs - lastSpeechAt >= silenceMs ? 'ended' : 'listening'
    },
    hasHeardSpeech: () => lastSpeechAt !== null,
  }
}
