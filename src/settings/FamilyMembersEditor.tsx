import type { DraftMember, MemberErrors } from '../family/memberErrors'

const PALETTE = ['#e5484d', '#3e63dd', '#30a46c', '#f5a524', '#8e4ec6', '#12a594']

interface FamilyMembersEditorProps {
  members: readonly DraftMember[]
  errors: readonly MemberErrors[]
  onChange: (members: DraftMember[]) => void
}

export function FamilyMembersEditor({ members, errors, onChange }: FamilyMembersEditorProps) {
  const update = (index: number, patch: Partial<DraftMember>) =>
    onChange(members.map((member, i) => (i === index ? { ...member, ...patch } : member)))
  const add = () =>
    onChange([...members, { id: crypto.randomUUID(), name: '', tag: '', color: PALETTE[members.length % PALETTE.length] }])

  return (
    <section className="settings-section" aria-labelledby="members-heading">
      <h3 id="members-heading">Osoby</h3>
      {members.map((member, index) => (
        <div className="member-row" key={member.id}>
          <label>
            Imię
            <input value={member.name} onChange={(event) => update(index, { name: event.target.value })} />
          </label>
          <label>
            Tag
            <input value={member.tag} onChange={(event) => update(index, { tag: event.target.value })} />
          </label>
          <label>
            Kolor
            <input type="color" value={member.color} onChange={(event) => update(index, { color: event.target.value })} />
          </label>
          <button type="button" onClick={() => onChange(members.filter((_, i) => i !== index))}>
            Usuń
          </button>
          {Object.values(errors[index]).map((message) => (
            <p key={message} className="field-error" role="alert">
              {message}
            </p>
          ))}
        </div>
      ))}
      <button type="button" onClick={add}>
        Dodaj osobę
      </button>
    </section>
  )
}
