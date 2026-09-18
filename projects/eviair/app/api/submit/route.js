import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { hashReading, anchorToXRPL } from '@/lib/xrpl'
import CITIES from '@/lib/cities'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
}

export async function POST(req) {
  const app      = getAdminApp()
  const db       = getFirestore(app)
  const storage  = getStorage(app)

  let city, pm25, pm10, aqi, submitter_note, photo

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData   = await req.formData()
    city             = formData.get('city')
    pm25             = formData.get('pm25')
    pm10             = formData.get('pm10')
    aqi              = formData.get('aqi')
    submitter_note   = formData.get('submitter_note')
    photo            = formData.get('photo')
  } else {
    const body       = await req.json()
    city             = body.city
    pm25             = body.pm25
    pm10             = body.pm10
    aqi              = body.aqi
    submitter_note   = body.submitter_note
  }

  if (!city || !aqi) {
    return Response.json(
      { error: 'city and aqi are required' },
      { status: 400 }
    )
  }

  const cityData   = CITIES.find(c => c.name === city)
  const created_at = new Date().toISOString()

  let photo_url = null
  if (photo && photo.size > 0) {
    try {
      const ext      = photo.name.split('.').pop()
      const filename = `reading-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer   = Buffer.from(await photo.arrayBuffer())
      const bucket   = storage.bucket()
      const file     = bucket.file(filename)
      await file.save(buffer, { contentType: photo.type })
      await file.makePublic()
      photo_url = `https://storage.googleapis.com/${bucket.name}/${filename}`
      console.log('Photo uploaded:', photo_url)
    } catch (e) {
      console.error('Photo upload error:', e.message)
    }
  }

  const hash = hashReading({
    city,
    pm25:      pm25 ? parseFloat(pm25) : null,
    pm10:      pm10 ? parseFloat(pm10) : null,
    aqi:       parseInt(aqi),
    created_at,
    photo_url
  })

  let xrpl_txid = null
  try {
    xrpl_txid = await anchorToXRPL(hash)
  } catch (e) {
    console.error('XRPL anchor failed:', e.message)
  }

  const reading = {
    city,
    lat:            cityData?.lat ?? null,
    lng:            cityData?.lng ?? null,
    pm25:           pm25 ? parseFloat(pm25) : null,
    pm10:           pm10 ? parseFloat(pm10) : null,
    aqi:            parseInt(aqi),
    submitter_note: submitter_note || null,
    photo_url,
    xrpl_txid,
    data_hash:      hash,
    created_at,
    validated:      false
  }

  const docRef = await db.collection('readings').add(reading)

  return Response.json({ txid: xrpl_txid, id: docRef.id, hash })
}
