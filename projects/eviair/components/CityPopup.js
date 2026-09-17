import { aqiLabel, aqiColor } from '@/utils/aqi'
import { computeConsensus } from '@/utils/consensus'

export default function CityPopup({ cityName, readings }) {
  const explorerBase = process.env.NEXT_PUBLIC_XRPL_EXPLORER
  const latest       = readings[0]
  const consensus = computeConsensus(readings)
  const avg       = consensus.validated
    ? consensus.avg
    : readings.length
      ? Math.round(readings.reduce((s, r) => s + r.aqi, 0) / readings.length)
      : null

  return (
    <div style={{ minWidth: 240, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        background: '#1B4332',
        margin:     '-8px -12px 12px',
        padding:    '12px 16px',
        borderRadius: '8px 8px 0 0'
      }}>
        <p style={{ fontWeight: 600, fontSize: 16, color: '#F5F0E8', margin: 0 }}>
          {cityName}
        </p>
        <p style={{ fontSize: 11, color: '#B7E4C7', margin: '2px 0 0' }}>
          {readings.length} report{readings.length !== 1 ? 's' : ''} in last 24h
        </p>
        {consensus.validated && (
          <div style={{
            display:      'inline-block',
            marginTop:    6,
            padding:      '3px 10px',
            background:   '#B7E4C7',
            borderRadius: 20,
            fontSize:     11,
            fontWeight:   600,
            color:        '#1B4332'
          }}>
            Validated — {consensus.count} consistent reports
          </div>
        )}
        {!consensus.validated && readings.length > 0 && (
          <div style={{
            display:      'inline-block',
            marginTop:    6,
            padding:      '3px 10px',
            background:   '#FEF9C3',
            borderRadius: 20,
            fontSize:     11,
            fontWeight:   500,
            color:        '#854D0E'
          }}>
            {consensus.reason}
          </div>
        )}
      </div>

      {readings.length === 0 && (
        <p style={{ color: '#888', margin: 0, fontSize: 13, padding: '4px 0 8px' }}>
          No reports yet. Be the first to report.
        </p>
      )}

      {readings.length > 0 && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 8, marginBottom: 12
          }}>
            <div style={{
              background: '#F5F0E8', borderRadius: 8,
              padding: '10px 12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Latest AQI</div>
              <div style={{
                fontSize: 26, fontWeight: 700,
                color: aqiColor(latest.aqi)
              }}>
                {latest.aqi}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {aqiLabel(latest.aqi)}
              </div>
            </div>
            <div style={{
              background: '#F5F0E8', borderRadius: 8,
              padding: '10px 12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>24h Average</div>
              <div style={{
                fontSize: 26, fontWeight: 700,
                color: aqiColor(avg)
              }}>
                {avg}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {readings.length} report{readings.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #EAE4D6', paddingTop: 10, maxHeight: 180, overflowY: 'auto' }}>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent reports
            </p>
            {readings.map(r => (
              <div key={r.id} style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
                padding:        '5px 0',
                borderBottom:   '1px solid #F5F0E8',
                fontSize:       12
              }}>
                <div>
                  <span style={{ fontWeight: 500, color: aqiColor(r.aqi) }}>
                    AQI {r.aqi}
                  </span>
                  {r.pm25 && (
                    <span style={{ color: '#888', marginLeft: 6 }}>PM2.5 {r.pm25}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#aaa', fontSize: 11 }}>
                    {new Date(r.created_at).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  {r.xrpl_txid && (
                    <a
                      href={`${explorerBase}/${r.xrpl_txid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize:     11,
                        color:        '#2D6A4F',
                        fontWeight:   500,
                        padding:      '2px 6px',
                        background:   '#B7E4C7',
                        borderRadius: 4
                      }}
                    >
                      XRPL ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
