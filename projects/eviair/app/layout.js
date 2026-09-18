import Nav from '@/components/Nav'
import './globals.css'

export const metadata = {
  title:       'EviAir',
  description: 'Citizen air quality evidence on XRPL',
  icons: {
    icon: '/icon.svg'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main style={{ paddingTop: 56 }}>
          {children}
        </main>
      </body>
    </html>
  )
}
