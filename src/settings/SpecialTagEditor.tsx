interface SpecialTagEditorProps {
  value: string
  /** Why the value cannot be saved, if it cannot. */
  error: string | null
  onChange: (value: string) => void
}

export function SpecialTagEditor({ value, error, onChange }: SpecialTagEditorProps) {
  return (
    <section className="settings-section" aria-labelledby="special-tag-heading">
      <h3 id="special-tag-heading">Wydarzenie specjalne</h3>
      <p className="hint">Wydarzenie z tym tagiem dostaje złotą gwiazdkę. Tag dodasz w edycji wydarzenia albo wpisując go w tytule (np. #star).</p>
      <div className="location-fields">
        <label>
          Tag wydarzenia specjalnego (bez #)
          <input value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
        {error !== null && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
