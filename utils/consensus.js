export function computeConsensus(readings) {
  if (readings.length < 3) return { validated: false, reason: 'Not enough reports' }

  const now    = Date.now()
  const recent = readings.filter(r =>
    now - new Date(r.created_at).getTime() < 6 * 60 * 60 * 1000
  )

  if (recent.length < 3) return { validated: false, reason: 'Need 3+ reports within 6 hours' }

  const aqis = recent.map(r => r.aqi)

  let bestGroup = []
  for (let i = 0; i < aqis.length; i++) {
    const group = aqis.filter(aqi => {
      const mid = (aqis[i] + aqi) / 2
      return Math.abs(aqis[i] - aqi) / mid <= 0.20
    })
    if (group.length > bestGroup.length) bestGroup = group
  }

  if (bestGroup.length < 3) return {
    validated: false,
    reason:    'Reports too inconsistent',
    avg:       Math.round(aqis.reduce((s, v) => s + v, 0) / aqis.length),
    count:     recent.length
  }

  const groupAvg = Math.round(bestGroup.reduce((s, v) => s + v, 0) / bestGroup.length)

  return {
    validated: true,
    reason:    `${bestGroup.length} consistent reports`,
    avg:       groupAvg,
    count:     bestGroup.length
  }
}
