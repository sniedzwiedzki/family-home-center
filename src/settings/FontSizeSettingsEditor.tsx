import { FONT_SIZE_MAX_PX, FONT_SIZE_MIN_PX, fontSizesDraftError, type FontSizesDraft } from './fontSizes'

interface FontSizeSettingsEditorProps {
  draft: FontSizesDraft
  onChange: (draft: FontSizesDraft) => void
}

const FIELDS: ReadonlyArray<{ key: keyof FontSizesDraft; label: string }> = [
  { key: 'eventTitle', label: 'Tytuł wydarzenia (px)' },
  { key: 'eventTime', label: 'Godzina wydarzenia (px)' },
  { key: 'dayNumber', label: 'Numer dnia miesiąca (px)' },
]

export function FontSizeSettingsEditor({ draft, onChange }: FontSizeSettingsEditorProps) {
  const error = fontSizesDraftError(draft)

  return (
    <section className="settings-section" aria-labelledby="font-sizes-heading">
      <h3 id="font-sizes-heading">Rozmiar czcionki</h3>
      <p className="hint">Rozmiar w pikselach ekranu kiosku (1600 px szerokości). Domyślnie: tytuł 20, godzina 16, numer dnia 41.</p>
      <div className="location-fields">
        {FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              inputMode="numeric"
              min={FONT_SIZE_MIN_PX}
              max={FONT_SIZE_MAX_PX}
              value={draft[field.key]}
              onChange={(event) => onChange({ ...draft, [field.key]: event.target.value })}
            />
          </label>
        ))}
        {error !== null && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
