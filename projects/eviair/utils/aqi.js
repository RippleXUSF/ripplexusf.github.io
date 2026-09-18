export function aqiColor(aqi) {
  if (!aqi)       return '#888780'
  if (aqi <= 50)  return '#1D9E75'
  if (aqi <= 100) return '#639922'
  if (aqi <= 150) return '#BA7517'
  if (aqi <= 200) return '#D85A30'
  return '#A32D2D'
}

export function aqiLabel(aqi) {
  if (!aqi)       return 'No data'
  if (aqi <= 50)  return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy (sensitive groups)'
  if (aqi <= 200) return 'Unhealthy'
  return 'Very unhealthy'
}
