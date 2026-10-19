import { MicIcon } from '../shell/icons'
import './assistant.css'

interface AssistantButtonProps {
  onOpen: () => void
}

/** A large quarter circle in the bottom-right corner of the screen, easy to hit with a thumb. */
export function AssistantButton({ onOpen }: AssistantButtonProps) {
  return (
    <button type="button" className="assistant-corner-button" aria-label="Asystent AI" onClick={onOpen}>
      <MicIcon />
    </button>
  )
}
