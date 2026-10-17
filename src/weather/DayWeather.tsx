import { describeWeather } from './weatherCodes'
import type { DayForecast } from './types'

export function DayWeather({ forecast }: { forecast: DayForecast }) {
  const { label, icon } = describeWeather(forecast.code)

  return (
    <div className="day-weather" title={label}>
      <span aria-hidden="true">{icon}</span>
      <span>{`${Math.round(forecast.tempMax)}°/${Math.round(forecast.tempMin)}°`}</span>
    </div>
  )
}
