'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import CityPopup from './CityPopup'
import { aqiColor } from '@/utils/aqi'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import CITIES from '@/lib/cities'

export default function Map() {
  const [readings, setReadings] = useState([])

  useEffect(() => {
    const since = new Date(Date.now() - 86400000).toISOString()
    const q = query(
      collection(db, 'readings'),
      where('created_at', '>=', since),
      orderBy('created_at', 'desc')
    )
    getDocs(q).then(snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setReadings(data)
    })
  }, [])

  return (
    <MapContainer
      center={[20.5, 78.9]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {CITIES.map(city => {
        const cityReadings = readings.filter(r => r.city === city.name)
        const latest       = cityReadings[0]
        const color        = latest ? aqiColor(latest.aqi) : '#2D6A4F'
        return (
          <CircleMarker
            key={city.name}
            center={[city.lat, city.lng]}
            radius={latest ? 16 : 8}
            pathOptions={{
              color,
              fillColor:   color,
              fillOpacity: latest ? 0.85 : 0.25,
              weight:      2
            }}
          >
            <Popup>
              <CityPopup cityName={city.name} readings={cityReadings} />
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
