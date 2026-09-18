'use client'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{
      height:         'calc(100vh - 56px)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#F5F0E8',
      color:          '#2D6A4F',
      gap:            12
    }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Loading map...</div>
    </div>
  )
})

export default function Home() {
  return (
    <div style={{ height: 'calc(100vh - 56px)' }}>
      <Map />
    </div>
  )
}
