import { describeWeather } from './weatherCodes'
import type { DayForecast } from './types'

export function DayWeather({ forecast }: { forecast: DayForecast }) {
  const { label, icon } = describeWeather(forecast.code)
  const chance = forecast.precipitationChance

  return (
    <div className="day-weather" title={label}>
      <span aria-hidden="true">{icon}</span>
      <span>{`${Math.round(forecast.tempMax)}° / ${Math.round(forecast.tempMin)}°`}</span>
      {chance !== null && chance > 0 && <span className="rain-chance">{`${Math.round(chance)}%`}</span>}
    </div>
  )
}
