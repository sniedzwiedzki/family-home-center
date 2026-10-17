import { formatClock } from '../shared/format'
import { forecastSlots } from '../weather/slots'
import type { Forecast } from '../weather/types'
import { describeWeather } from '../weather/weatherCodes'
import { useCurrentHour } from './useCurrentHour'

export function BottomBar({ forecast }: { forecast: Forecast | null }) {
  const hour = useCurrentHour()

  return (
    <footer className="bottom-bar" aria-label="Prognoza pogody na 24 godziny">
      {forecast === null ? (
        <p className="forecast-empty">Brak prognozy pogody</p>
      ) : (
        <ol className="forecast-strip" key={hour.getTime()}>
          {forecastSlots(forecast.hours, hour).map(({ time, forecast: slot }) => (
            <li key={time.getTime()} className="forecast-slot">
              <span className="slot-time">{formatClock(time)}</span>
              {slot === null ? (
                <span className="slot-missing">–</span>
              ) : (
                <span className="slot-weather">
                  <span className="slot-icon" title={describeWeather(slot.code).label}>
                    {describeWeather(slot.code).icon}
                  </span>
                  <span className="slot-temp">{`${Math.round(slot.temp)}°`}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </footer>
  )
}
