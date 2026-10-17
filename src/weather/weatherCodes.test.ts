import { describe, expect, it } from 'vitest'
import { describeWeather } from './weatherCodes'

describe('describeWeather', () => {
  it.each([
    [0, 'Bezchmurnie'],
    [2, 'Częściowe zachmurzenie'],
    [3, 'Pochmurno'],
    [45, 'Mgła'],
    [53, 'Mżawka'],
    [63, 'Deszcz'],
    [75, 'Śnieg'],
    [81, 'Przelotny deszcz'],
    [86, 'Przelotny śnieg'],
    [95, 'Burza'],
  ])('describes code %i in Polish', (code, label) => {
    expect(describeWeather(code).label).toBe(label)
    expect(describeWeather(code).icon).not.toBe('')
  })

  it('falls back for unknown codes', () => {
    expect(describeWeather(1234)).toEqual({ label: 'Brak danych', icon: '❔' })
  })
})
