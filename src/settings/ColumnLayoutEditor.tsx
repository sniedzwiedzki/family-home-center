import { columnLayoutFromDraft, type ColumnLayoutDraft } from './columnLayoutDraft'

const WIDTHS: ReadonlyArray<{ key: keyof Omit<ColumnLayoutDraft, 'workTag'>; label: string }> = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'recurring', label: 'Powtarzalne' },
  { key: 'work', label: 'Praca' },
  { key: 'other', label: 'Inne' },
]

interface ColumnLayoutEditorProps {
  draft: ColumnLayoutDraft
  onChange: (draft: ColumnLayoutDraft) => void
}

export function ColumnLayoutEditor({ draft, onChange }: ColumnLayoutEditorProps) {
  return (
    <section className="settings-section" aria-labelledby="column-layout-heading">
      <h3 id="column-layout-heading">Kolumny</h3>
      <p className="hint">Szerokość względna kolumn (od 0,5 do 10) i tag, który kieruje wydarzenie do kolumny „Praca”.</p>
      <div className="location-fields">
        {WIDTHS.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              max={10}
              step={0.5}
              value={draft[field.key]}
              onChange={(event) => onChange({ ...draft, [field.key]: event.target.value })}
            />
          </label>
        ))}
        <label>
          Tag pracy
          <input type="text" value={draft.workTag} onChange={(event) => onChange({ ...draft, workTag: event.target.value })} />
        </label>
        {columnLayoutFromDraft(draft) === null && (
          <p className="field-error" role="alert">
            Szerokość musi być liczbą od 0,5 do 10, a tag nie może być pusty.
          </p>
        )}
      </div>
    </section>
  )
}
