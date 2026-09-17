import { Client, Wallet, convertStringToHex } from 'xrpl'
import crypto from 'crypto'

export function hashReading(data) {
  const payload = JSON.stringify({
    city:       data.city,
    pm25:       data.pm25,
    pm10:       data.pm10,
    aqi:        data.aqi,
    created_at: data.created_at,
    photo_url:  data.photo_url ?? null
  })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export async function anchorToXRPL(hash) {
  const client = new Client('wss://s.altnet.rippletest.net:51233')
  await client.connect()
  const wallet = Wallet.fromSeed(process.env.XRPL_SEED)
  const tx = await client.submitAndWait({
    TransactionType: 'Payment',
    Account:         wallet.address,
    Destination:     'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    Amount:          '1',
    Memos: [{
      Memo: {
        MemoData: convertStringToHex(hash),
        MemoType: convertStringToHex('eviair/v1')
      }
    }]
  }, { wallet })
  await client.disconnect()
  return tx.result.hash
}
