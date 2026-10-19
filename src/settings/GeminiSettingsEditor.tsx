import type { GeminiDraft } from './geminiDraft'

interface GeminiSettingsEditorProps {
  draft: GeminiDraft
  onChange: (draft: GeminiDraft) => void
}

export function GeminiSettingsEditor({ draft, onChange }: GeminiSettingsEditorProps) {
  return (
    <section className="settings-section" aria-labelledby="gemini-heading">
      <h3 id="gemini-heading">Asystent AI (Gemini)</h3>
      <p className="hint">
        Przycisk asystenta nagrywa polecenie głosowe i wysyła nagranie do Google Gemini, które zmienia kalendarz. Wymaga klucza API (
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          Google AI Studio
        </a>
        ); wydarzenia zmienia w tym samym kalendarzu, który jest połączony powyżej. Instrukcja jest w README (sekcja Gemini voice assistant).
      </p>
      <div className="location-fields">
        <label>
          Klucz API Gemini
          <input type="password" autoComplete="off" value={draft.apiKey} onChange={(event) => onChange({ ...draft, apiKey: event.target.value })} />
        </label>
        <label>
          Model Gemini
          <input value={draft.model} onChange={(event) => onChange({ ...draft, model: event.target.value })} />
        </label>
      </div>
    </section>
  )
}
