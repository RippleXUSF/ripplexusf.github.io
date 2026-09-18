'use client'
import { useState } from 'react'

export default function Verify() {
  const [txid, setTxid]       = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res  = await fetch(`/api/verify?txid=${txid.trim()}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 580, margin: '4rem auto',
      padding: '0 1.5rem'
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize:   28,
          fontWeight: 700,
          color:      '#1B4332',
          margin:     '0 0 8px'
        }}>
          Verify a reading
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
          Paste an XRPL transaction ID to confirm a reading has not been altered since it was submitted.
        </p>
      </div>

      <form onSubmit={handleVerify} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={txid}
            onChange={e => setTxid(e.target.value)}
            placeholder="XRPL transaction ID"
            style={{
              flex:         1,
              padding:      '11px 14px',
              borderRadius: 8,
              border:       '1.5px solid #EAE4D6',
              fontSize:     14,
              background:   '#FFFFFF',
              color:        '#1B4332',
              outline:      'none'
            }}
          />
          <button
            type="submit"
            disabled={loading || !txid}
            style={{
              padding:      '11px 20px',
              borderRadius: 8,
              border:       'none',
              background:   '#1B4332',
              color:        '#F5F0E8',
              fontWeight:   600,
              fontSize:     14,
              cursor:       loading || !txid ? 'not-allowed' : 'pointer',
              whiteSpace:   'nowrap',
              opacity:      !txid ? 0.5 : 1
            }}
          >
            {loading ? 'Checking...' : 'Verify'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{
          background:   '#FEF2F2',
          border:       '1px solid #FECACA',
          borderRadius: 10,
          padding:      '12px 16px',
          color:        '#991B1B',
          fontSize:     13,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          border:       '1.5px solid #EAE4D6',
          borderRadius: 16,
          overflow:     'hidden',
          background:   '#FFFFFF'
        }}>
          <div style={{
            padding:    '20px 24px',
            background: result.match ? '#1B4332' : '#7F1D1D'
          }}>
            <p style={{
              margin:     0,
              fontWeight: 700,
              fontSize:   17,
              color:      '#F5F0E8'
            }}>
              {result.match ? 'Reading is intact' : 'Reading has been altered'}
            </p>
            <p style={{
              margin:     '6px 0 0',
              fontSize:   13,
              color:      result.match ? '#B7E4C7' : '#FCA5A5',
              lineHeight: 1.5
            }}>
              {result.match
                ? 'The hash on XRPL matches the database record. This reading has not been modified.'
                : 'Hash mismatch detected. This record may have been tampered with after anchoring.'}
            </p>
          </div>

          <div style={{ padding: '20px 24px' }}>
            <table style={{
              width:          '100%',
              fontSize:       13,
              borderCollapse: 'collapse',
              color:          '#1B4332'
            }}>
              <tbody>
                {[
                  ['City',      result.reading.city],
                  ['AQI',       result.reading.aqi],
                  ['PM2.5',     result.reading.pm25 ?? '—'],
                  ['PM10',      result.reading.pm10 ?? '—'],
                  ['Submitted', new Date(result.reading.created_at).toLocaleString()],
                  ['Hash',      result.onChainHash],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #F5F0E8' }}>
                    <td style={{
                      padding:       '8px 0',
                      color:         '#888',
                      width:         100,
                      fontWeight:    500,
                      fontSize:      12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {k}
                    </td>
                    <td style={{
                      padding:    '8px 0',
                      fontFamily: k === 'Hash' ? 'monospace' : 'inherit',
                      fontSize:   k === 'Hash' ? 11 : 13,
                      wordBreak:  'break-all'
                    }}>
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {result.reading.photo_url && (
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontSize:      12,
                  color:         '#888',
                  marginBottom:  8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight:    500
                }}>
                  Photo evidence
                </p>
                <img
                  src={result.reading.photo_url}
                  alt="Submitted evidence"
                  style={{
                    width:        '100%',
                    borderRadius: 8,
                    objectFit:    'cover',
                    maxHeight:    200
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
