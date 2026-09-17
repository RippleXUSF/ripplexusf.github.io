import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { hashReading } from '@/lib/xrpl'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const txid = searchParams.get('txid')

  if (!txid) {
    return Response.json({ error: 'txid is required' }, { status: 400 })
  }

  try {
    const app = getAdminApp()
    const db  = getFirestore(app)

    const USF_PROXY     = process.env.USF_PROXY_URL
    const XRPL_ENDPOINT = USF_PROXY || 'https://s.altnet.rippletest.net:51234'

    const xrplRes = await fetch(XRPL_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        method: 'tx',
        params: [{ transaction: txid.trim() }]
      })
    })
    const xrplData    = await xrplRes.json()
    const memoHex     = xrplData.result?.Memos?.[0]?.Memo?.MemoData
    if (!memoHex) {
      return Response.json({ error: 'No EviAir memo found on this transaction' }, { status: 400 })
    }
    const memoType    = xrplData.result?.Memos?.[0]?.Memo?.MemoType
    const decodedType = Buffer.from(memoType || '', 'hex').toString('utf8')
    if (!decodedType.startsWith('eviair')) {
      return Response.json({ error: 'Transaction is not an EviAir record' }, { status: 400 })
    }
    const onChainHash = Buffer.from(memoHex, 'hex').toString('utf8')

    const snapshot = await db.collection('readings')
      .where('xrpl_txid', '==', txid.trim())
      .limit(1)
      .get()

    if (snapshot.empty) {
      return Response.json({ error: 'Reading not found in database' }, { status: 404 })
    }

    const reading = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }

    const recomputed = hashReading({
      city:       reading.city,
      pm25:       reading.pm25,
      pm10:       reading.pm10,
      aqi:        reading.aqi,
      created_at: new Date(reading.created_at).toISOString(),
      photo_url:  reading.photo_url ?? null
    })

    return Response.json({
      match: recomputed === onChainHash,
      reading,
      onChainHash,
      recomputed
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
