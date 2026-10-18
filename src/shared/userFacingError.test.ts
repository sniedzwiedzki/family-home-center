import { describe, expect, it } from 'vitest'
import { describeFailure, UserFacingError } from './userFacingError'

describe('describeFailure', () => {
  it('shows the message of an error meant for the user', () => {
    expect(describeFailure(new UserFacingError('Brak połączenia.'), 'Coś poszło nie tak.')).toBe('Brak połączenia.')
  })

  it('falls back for any other failure, so internal details stay out of the screen', () => {
    expect(describeFailure(new Error('QuotaExceededError'), 'Coś poszło nie tak.')).toBe('Coś poszło nie tak.')
    expect(describeFailure('text', 'Coś poszło nie tak.')).toBe('Coś poszło nie tak.')
  })
})
