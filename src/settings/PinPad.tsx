import { useState } from 'react'

export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 8

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

interface PinPadProps {
  title: string
  error: string | null
  onSubmit: (pin: string) => void
}

export function PinPad({ title, error, onSubmit }: PinPadProps) {
  const [digits, setDigits] = useState('')

  const append = (digit: string) => setDigits((current) => (current.length < PIN_MAX_LENGTH ? current + digit : current))
  const submit = () => {
    onSubmit(digits)
    setDigits('')
  }

  return (
    <div className="pin-pad">
      <h2>{title}</h2>
      <output className="pin-display" aria-label="Wpisane cyfry">
        {'●'.repeat(digits.length)}
      </output>
      {error !== null && (
        <p className="pin-error" role="alert">
          {error}
        </p>
      )}
      <div className="pin-keys">
        {[...KEYS, 'back', '0', 'ok'].map((key) => {
          if (key === 'back') {
            return (
              <button key={key} type="button" aria-label="Usuń cyfrę" onClick={() => setDigits((current) => current.slice(0, -1))}>
                ⌫
              </button>
            )
          }
          if (key === 'ok') {
            return (
              <button key={key} type="button" disabled={digits.length < PIN_MIN_LENGTH} onClick={submit}>
                OK
              </button>
            )
          }
          return (
            <button key={key} type="button" onClick={() => append(key)}>
              {key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
