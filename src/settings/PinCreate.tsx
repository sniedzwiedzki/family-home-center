import { useState } from 'react'
import { PinPad } from './PinPad'

export function PinCreate({ onCreate }: { onCreate: (pin: string) => void }) {
  const [first, setFirst] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = (entered: string) => {
    if (first === null) {
      setFirst(entered)
      setError(null)
    } else if (entered === first) {
      onCreate(entered)
    } else {
      setFirst(null)
      setError('PIN-y nie są takie same, spróbuj ponownie')
    }
  }

  return <PinPad title={first === null ? 'Ustaw PIN do ustawień' : 'Powtórz PIN'} error={error} onSubmit={submit} />
}
