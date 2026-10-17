import { useState } from 'react'
import { PinPad } from './PinPad'

export function PinEntry({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [error, setError] = useState<string | null>(null)

  return (
    <PinPad
      title="Wpisz PIN"
      error={error}
      onSubmit={(entered) => (entered === pin ? onUnlock() : setError('Nieprawidłowy PIN'))}
    />
  )
}
