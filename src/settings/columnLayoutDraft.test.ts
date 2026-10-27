import { describe, expect, it } from 'vitest'
import { DEFAULT_COLUMN_LAYOUT } from '../calendar/columns'
import { columnLayoutFromDraft, draftFromColumnLayout } from './columnLayoutDraft'

describe('column layout draft', () => {
  it('turns the layout into text fields and back', () => {
    const draft = draftFromColumnLayout(DEFAULT_COLUMN_LAYOUT)
    expect(draft).toEqual({ all: '3', recurring: '2', work: '1.5', other: '1.5', workTag: 'praca' })
    expect(columnLayoutFromDraft(draft)).toEqual(DEFAULT_COLUMN_LAYOUT)
  })

  it('normalizes the work tag', () => {
    expect(columnLayoutFromDraft({ ...draftFromColumnLayout(DEFAULT_COLUMN_LAYOUT), workTag: ' Biuro ' })?.workTag).toBe('biuro')
  })

  it('is null while a width is not a number from 0.5 to 10 or the tag is empty', () => {
    const draft = draftFromColumnLayout(DEFAULT_COLUMN_LAYOUT)
    expect(columnLayoutFromDraft({ ...draft, all: 'abc' })).toBeNull()
    expect(columnLayoutFromDraft({ ...draft, work: '0.25' })).toBeNull()
    expect(columnLayoutFromDraft({ ...draft, other: '11' })).toBeNull()
    expect(columnLayoutFromDraft({ ...draft, workTag: '' })).toBeNull()
  })
})
