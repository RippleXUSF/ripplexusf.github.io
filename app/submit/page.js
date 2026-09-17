'use client'
import { useState } from 'react'
import CITIES from '@/lib/cities'

const inputStyle = {
  padding:      '10px 14px',
  borderRadius: 8,
  border:       '1.5px solid #EAE4D6',
  fontSize:     14,
  width:        '100%',
  background:   '#FFFFFF',
  color:        '#1B4332',
  outline:      'none',
  transition:   'border-color 0.15s'
}

const labelStyle = {
  display:    'flex',
  flexDirection: 'column',
  gap:        6,
  fontSize:   13,
  fontWeight: 500,
  color:      '#2D6A4F'
}

export default function Submit() {
  const [form, setForm]       = useState({
    city: 'Delhi', pm25: '', pm10: '', aqi: '', submitter_note: ''
  })
  const [photo, setPhoto]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))
      if (photo) formData.append('photo', photo)
      const res = await fetch('/api/submit', {
        method: 'POST',
        body:   formData
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (result) return (
    <div style={{
      maxWidth: 520, margin: '4rem auto',
      padding: '0 1.5rem'
    }}>
      <div style={{
        background:   '#1B4332',
        borderRadius: 16,
        padding:      '2rem',
        color:        '#F5F0E8',
        marginBottom: 16
      }}>
        <p style={{ fontWeight: 600, fontSize: 18, margin: '0 0 8px' }}>
          Reading anchored
        </p>
        <p style={{ fontSize: 14, color: '#B7E4C7', margin: 0, lineHeight: 1.6 }}>
          Your reading has been permanently recorded on the XRP Ledger as tamper-evident evidence.
        </p>
      </div>

      {result.txid && (
        <div style={{
          background:   '#FFFFFF',
          borderRadius: 12,
          padding:      '1.25rem',
          marginBottom: 12,
          border:       '1.5px solid #EAE4D6'
        }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            XRPL Transaction
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_XRPL_EXPLORER}/${result.txid}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize:     13,
              color:        '#2D6A4F',
              fontWeight:   500,
              wordBreak:    'break-all'
            }}
          >
            {result.txid}
          </a>
        </div>
      )}

      <div style={{
        background:   '#FFFFFF',
        borderRadius: 12,
        padding:      '1.25rem',
        marginBottom: 20,
        border:       '1.5px solid #EAE4D6'
      }}>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          SHA-256 Hash
        </p>
        <code style={{ fontSize: 12, color: '#1B4332', wordBreak: 'break-all' }}>
          {result.hash}
        </code>
      </div>

      <button
        onClick={() => {
          setResult(null)
          setForm({ city: 'Delhi', pm25: '', pm10: '', aqi: '', submitter_note: '' })
        }}
        style={{
          width:        '100%',
          padding:      '12px',
          borderRadius: 8,
          border:       '1.5px solid #1B4332',
          background:   'transparent',
          color:        '#1B4332',
          fontWeight:   500,
          fontSize:     14,
          cursor:       'pointer'
        }}
      >
        Submit another reading
      </button>
    </div>
  )

  return (
    <div style={{
      maxWidth: 520, margin: '4rem auto',
      padding: '0 1.5rem'
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize:   28,
          fontWeight: 700,
          color:      '#1B4332',
          margin:     '0 0 8px'
        }}>
          Report a reading
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
          Submit an air quality reading from your location. It will be hashed and permanently anchored on the XRP Ledger.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background:   '#FFFFFF',
        borderRadius: 16,
        padding:      '1.75rem',
        border:       '1.5px solid #EAE4D6',
        display:      'flex',
        flexDirection: 'column',
        gap:          18
      }}>
        <label style={labelStyle}>
          City
          <select
            value={form.city}
            onChange={e => set('city', e.target.value)}
            style={inputStyle}
          >
            {CITIES.map(c => <option key={c.name}>{c.name}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          AQI *
          <input
            type="number" min="0" max="999" required
            placeholder="e.g. 142"
            value={form.aqi}
            onChange={e => set('aqi', e.target.value)}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={labelStyle}>
            PM2.5 (μg/m³)
            <input
              type="number" min="0"
              placeholder="optional"
              value={form.pm25}
              onChange={e => set('pm25', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            PM10 (μg/m³)
            <input
              type="number" min="0"
              placeholder="optional"
              value={form.pm10}
              onChange={e => set('pm10', e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Note
          <textarea
            rows={3}
            placeholder="Location, sensor used, conditions... (optional)"
            value={form.submitter_note}
            onChange={e => set('submitter_note', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <label style={labelStyle}>
          Photo (optional)
          <div style={{
            border:       '1.5px dashed #EAE4D6',
            borderRadius: 8,
            padding:      '16px',
            textAlign:    'center',
            background:   '#FAFAF8',
            cursor:       'pointer'
          }}>
            {preview ? (
              <div>
                <img src={preview} alt="preview" style={{
                  maxHeight: 160, borderRadius: 6,
                  maxWidth: '100%', objectFit: 'cover'
                }}/>
                <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                  Click to change
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                Tap to add a photo of the conditions
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-input"
              onChange={e => {
                const file = e.target.files[0]
                if (file) {
                  setPhoto(file)
                  setPreview(URL.createObjectURL(file))
                }
              }}
            />
          </div>
          <label htmlFor="photo-input" style={{
            display:      'block',
            textAlign:    'center',
            padding:      '8px',
            borderRadius: 6,
            border:       '1px solid #EAE4D6',
            fontSize:     13,
            cursor:       'pointer',
            color:        '#2D6A4F',
            marginTop:    8
          }}>
            Choose photo
          </label>
        </label>

        {error && (
          <div style={{
            background:   '#FEF2F2',
            border:       '1px solid #FECACA',
            borderRadius: 8,
            padding:      '10px 14px',
            color:        '#991B1B',
            fontSize:     13
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding:      '13px',
            borderRadius: 8,
            border:       'none',
            background:   loading ? '#2D6A4F' : '#1B4332',
            color:        '#F5F0E8',
            fontWeight:   600,
            fontSize:     15,
            cursor:       loading ? 'not-allowed' : 'pointer',
            transition:   'background 0.15s'
          }}
        >
          {loading ? 'Anchoring on XRPL...' : 'Submit and anchor'}
        </button>
      </form>
    </div>
  )
}
