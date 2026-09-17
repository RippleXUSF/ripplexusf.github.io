'use client'
import Link from 'next/link'

export default function Nav() {
  return (
    <nav style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 2rem',
      height:         56,
      background:     '#1B4332',
      position:       'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000
    }}>
      <Link href="/" style={{
        fontWeight: 600,
        fontSize:   18,
        color:      '#F5F0E8',
        letterSpacing: '0.02em'
      }}>
        EviAir
      </Link>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { href: '/',       label: 'Map'    },
          { href: '/submit', label: 'Report' },
          { href: '/verify', label: 'Verify' },
        ].map(({ href, label }) => (
          <Link key={href} href={href} style={{
            padding:      '6px 14px',
            borderRadius: 20,
            fontSize:     14,
            color:        '#B7E4C7',
            fontWeight:   500,
            transition:   'background 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
