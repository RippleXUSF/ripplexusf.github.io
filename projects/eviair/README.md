# EviAir

EviAir is an open-source citizen air quality reporting platform that anchors
pollution readings as tamper-evident evidence on the XRP Ledger (XRPL).

Built as part of the **USF × Ripple Research Partnership** at the University
of San Francisco. The project explores practical uses of blockchain technology
for environmental accountability — specifically whether public ledgers can
make crowdsourced environmental data resistant to manipulation.

**Live app:** https://eviair.vercel.app

---

## The problem this solves

Air quality data in India is frequently underreported or quietly altered by
industrial operators and local governments with incentives to show clean
numbers. Centralized databases — even well-intentioned ones — can be edited
after the fact with no public trace.

EviAir addresses this by giving citizens a way to submit their own sensor
readings and immediately anchor them on the XRP Ledger. Once anchored, the
reading cannot be silently changed: any alteration to the database record
will cause the cryptographic hash to mismatch the value stored on-chain.
The blockchain does not verify that a reading is accurate — it verifies that
a reading has not been changed since it was submitted.

This is a meaningful distinction. EviAir is not a replacement for calibrated
sensors or official monitoring networks. It is a tamper-evidence layer: a way
for communities, journalists, researchers, and regulators to detect if
environmental records have been manipulated.

---

## Research context — USF × Ripple

The University of San Francisco hosts a dedicated XRP Ledger node
(`ripple.cs.usfca.edu`) as part of its partnership with Ripple, the company
behind the XRPL protocol. The partnership supports student and faculty
research into real-world applications of blockchain technology.

EviAir is one output of that partnership. It was developed by Natálie Hluší
as applied research into environmental data integrity, exploring:

- Whether the XRPL's low transaction cost (fractions of a cent) makes it
  viable for high-frequency civic data anchoring
- How crowdsourced sensor data can be cross-validated without a trusted
  central authority
- How photo evidence can be included in the tamper-evident record
- Whether non-technical citizens can meaningfully participate in blockchain-
  backed data collection through a simple web interface

The USF node (`ripple.cs.usfca.edu`) provides an on-campus rippled instance
that EviAir can route verification queries through, reducing reliance on
public Ripple infrastructure and enabling the research team to inspect
transaction data directly.

---

## How the application works

### Three pages

**Map (`/`)** — shows all citizen-submitted readings across 10 major Indian
cities in the last 24 hours. Each city is a circle on the map colored by
AQI severity:

| Color | AQI range | Meaning |
|---|---|---|
| Green | ≤ 50 | Good |
| Yellow-green | ≤ 100 | Moderate |
| Orange | ≤ 150 | Unhealthy for sensitive groups |
| Red | ≤ 200 | Unhealthy |
| Dark red | > 200 | Very unhealthy |

Cities with 3+ consistent readings within 6 hours show a **Validated** badge
and a thicker border. Click any city to see its full reading history.

**Report (`/submit`)** — submit an air quality reading. Fields:
- City (required) — one of 10 major Indian cities
- AQI (required) — Air Quality Index, 0–999
- PM2.5 (optional) — fine particulate matter in μg/m³
- PM10 (optional) — coarse particulate matter in μg/m³
- Note (optional) — location, sensor model, weather conditions
- Photo (optional) — photo of the sky, sensor, or surroundings

On submit, the reading is hashed and anchored on XRPL. The success screen
shows the transaction ID (a link to the XRPL explorer) and the SHA-256 hash.

**Verify (`/verify`)** — paste any XRPL transaction ID to verify a reading.
The server fetches the transaction memo from the ledger, looks up the
original reading in the database, recomputes the hash from the stored data,
and compares. Green = the record is intact. Red = the record has been altered.

---

## How the blockchain anchoring works

### The XRP Ledger

The XRP Ledger (XRPL) is a public, decentralized blockchain maintained by a
network of independent validators worldwide. Unlike Bitcoin or Ethereum, XRPL
uses a consensus protocol (not proof-of-work mining), which makes transactions
fast (3–5 seconds to finality) and cheap (currently ~0.000010 XRP per
transaction, a fraction of a cent).

XRPL is operated by Ripple and a broader ecosystem of validators. It was
originally designed for cross-border payments but supports arbitrary data
storage through **transaction memos** — structured fields attached to any
transaction that are stored permanently in the ledger.

EviAir uses memos to store SHA-256 hashes of air quality readings.

### The anchoring process (step by step)

When a reading is submitted via the `/submit` form:

1. **The server receives the form data** — city, AQI, PM2.5, PM10, note,
   and optionally a photo file.

2. **Photo upload (if provided)** — the photo is uploaded to Firebase Storage
   (Google Cloud Storage) and made public. A permanent URL is generated. This
   URL becomes part of the canonical data record and is included in the hash.

3. **SHA-256 hashing** — the server builds a canonical JSON object:
   ```json
   {
     "city": "Delhi",
     "pm25": 89.5,
     "pm10": 142.0,
     "aqi": 172,
     "created_at": "2026-05-07T14:23:01.000Z",
     "photo_url": "https://storage.googleapis.com/..."
   }
   ```
   This object is serialized to a string and hashed with SHA-256, producing
   a 64-character hex digest. The field order is fixed so the hash is always
   reproducible from the same data.

4. **XRPL transaction** — the server connects to an XRPL node via WebSocket,
   constructs a Payment transaction from the EviAir wallet to a fixed
   destination address (the XRPL genesis account, `rHb9CJAWyB4rj91...`),
   and attaches the hash as a Memo:
   ```
   MemoType: eviair/v1      (hex-encoded)
   MemoData: <sha256 hash>  (hex-encoded)
   ```
   The payment amount is 1 drop (0.000001 XRP). The transaction is submitted
   and the server waits for ledger confirmation before proceeding.

5. **Database storage** — the transaction ID (txid) and the hash are stored
   as a document in the Firestore `readings` collection alongside all reading
   fields.

6. **Response** — the client receives the txid and hash, displayed on the
   success screen with a link to the XRPL explorer.

### Why this provides tamper-evidence

The XRPL is append-only. Once a transaction is confirmed, its memo cannot be
edited or deleted — it is part of the permanent ledger history, replicated
across hundreds of validator nodes globally.

The hash stored in that memo is a cryptographic fingerprint of the original
reading. If anyone later modifies the reading in Firestore — even a single
character — the recomputed hash will differ from the on-chain hash, and the
verify page will show a red mismatch.

The verification logic (in `app/api/verify/route.js`):
1. Fetches the transaction from XRPL and extracts the memo hash
2. Verifies the `MemoType` starts with `eviair` (rejects unrelated transactions)
3. Queries Firestore for the reading with that transaction ID
4. Recomputes the hash from the stored data using the same canonical format
5. Compares — if they match, the reading is intact; if not, something changed

---

## Cross-validation algorithm

A city reading is marked **Validated** when independent submissions agree
with each other. The algorithm (in `utils/consensus.js`):

1. Filter to readings submitted within the last 6 hours for that city
2. Require at least 3 such readings
3. Find the largest group of readings that are all within 20% of each other,
   measured pairwise using the midpoint as the reference:
   ```
   |a - b| / ((a + b) / 2) ≤ 0.20
   ```
4. If that group has 3+ members, the city is validated. The displayed average
   is the mean of the consensus group, not the full set (outliers excluded).

The pairwise midpoint method is more robust than comparing everyone to a
global mean: it correctly identifies a cluster of consistent readings even
when there are significant outliers pulling the mean away. A single actor
submitting a fake reading cannot prevent validation as long as three honest
readings exist — they can only fail to join the consensus group.

All readings — including outliers — remain anchored on XRPL as permanent
evidence. Outlier readings are not deleted; they are simply not counted
toward the validated average.

---

## Simplifications, limitations, and future work

This project is research software. It demonstrates the concept and makes
deliberate simplifications to keep the scope manageable. This section is an
honest account of what was simplified and what a production system would need
to address.

### Cities are treated as single points

Delhi has a population of 32 million people spread across roughly 1,500 km².
Air quality at Connaught Place is not the same as air quality in Noida or
Dwarka. In reality, a city like Delhi would need dozens or hundreds of
monitoring zones, each with their own stream of readings.

EviAir treats each city as a single named location with one set of coordinates.
This is a conscious simplification — the goal was to demonstrate the
anchoring and consensus mechanism across multiple cities, not to build a
production-grade spatial monitoring system. Expanding to sub-city zones would
require adding lat/lng bounding boxes, spatial clustering, and a map layer
that can render hundreds of markers at different zoom levels.

### The consensus algorithm is a starting point

The 20% pairwise tolerance threshold was chosen based on research into how
much AQI can legitimately vary between nearby sensors (sensor calibration
drift, micro-weather, sensor model differences) and what tolerance is tight
enough to prevent easy manipulation. But it has not been validated against
real-world sensor data from Indian cities.

A more robust system would benefit from:

- **Unique photo requirement per submission** — currently nothing prevents
  one person from submitting the same reading repeatedly from different
  sessions. Requiring a unique photo per submission (detected server-side by
  perceptual hash or metadata comparison) would make Sybil attacks — where
  one actor fakes multiple independent readings — significantly harder.

- **Photo GPS coordinates** — smartphone photos embed GPS coordinates in
  EXIF metadata. Verifying that the photo's GPS location matches the claimed
  city would be a strong signal of legitimacy. This could be checked server-
  side at upload time without requiring any extra input from the user.

- **Photo timestamp verification** — EXIF data also includes the time the
  photo was taken. Rejecting photos taken more than, say, 2 hours before
  submission would prevent people from recycling old photos as evidence for
  current conditions.

- **Sensor certification or weighting** — readings from certified reference
  sensors (government stations, calibrated devices with known models) could
  carry more weight in the consensus calculation than readings with no sensor
  information provided.

- **Longer validation windows and rolling consensus** — 6 hours is arbitrary.
  Research into typical reporting patterns for a given city would inform
  whether a tighter window (catching acute pollution events) or a longer one
  (for cities with sparse reporters) works better.

These are open research questions, not just engineering tasks. EviAir's role
in the USF × Ripple partnership is partly to generate the empirical data
needed to answer them.

### The blockchain: open, permanent, and independently verifiable

The most important property of the XRPL anchoring — and the one worth
emphasizing — is that **the record is fully public and requires no trust in
EviAir, USF, or Ripple to verify**.

Every reading that passes through EviAir produces an XRPL transaction that
anyone in the world can look up independently:

- On the testnet explorer: `https://testnet.xrpl.org/transactions/<txid>`
- Via any XRPL node's API: `POST https://s1.ripple.com:51234` with
  `{"method":"tx","params":[{"transaction":"<txid>"}]}`
- Via the USF node, using the same API format

The memo stored in that transaction contains the SHA-256 hash of the reading.
The reading data is stored in Firestore. Anyone — a journalist, a regulator,
a researcher, a citizen — can independently:

1. Pull the transaction from any XRPL node (not just ours)
2. Decode the MemoData field from hex to get the hash
3. Fetch the reading from the EviAir database (or from their own archived copy)
4. Recompute the hash themselves using the same canonical format
5. Confirm they match — without asking EviAir to confirm anything

This is the core value proposition of using a public blockchain rather than a
private database with an audit log: **the verification is trustless**. EviAir
could shut down tomorrow and the anchored readings would still be verifiable
forever, by anyone, using public tools. The ledger is replicated across
hundreds of independent validator nodes globally and has operated continuously
since 2012.

The Verify page in EviAir automates this process for non-technical users, but
it is not the only way to verify. The raw data is always available on-chain.

---

## The USF rippled node

### What rippled is

`rippled` is the reference server implementation of the XRP Ledger protocol,
maintained by Ripple. Running a rippled node means participating in the XRPL
network: the node stores a copy of the ledger, validates transactions with
other nodes, and can answer API queries about transaction history.

The USF node at `ripple.cs.usfca.edu` is a full rippled instance operated
by the USF CS department as part of the Ripple academic partnership. It is
connected to the XRPL network and maintains an up-to-date copy of the ledger.

### Why EviAir connects to it

By default, EviAir's verify endpoint queries the public Ripple testnet
(`s.altnet.rippletest.net`). The USF node provides an alternative:

- **Research independence** — queries go through infrastructure controlled
  by the research institution, not just Ripple's public servers
- **Auditability** — the research team can inspect raw transaction data
  directly on the node
- **Resilience** — if the public endpoint is unavailable, the USF node
  can serve as a fallback

### The proxy architecture

The USF node's HTTP API (`rippled` port 5005) only listens on `127.0.0.1`
(localhost) for security. It cannot be queried directly from the internet.

The proxy scripts (`scripts/usf-proxy.js` and `scripts/usf-proxy.py`) bridge
this gap: they run on `ripple.cs.usfca.edu` and expose a public HTTP endpoint
on port 3001 that forwards requests inward to `127.0.0.1:5005`.

```
Vercel (verify API) → ripple.cs.usfca.edu:3001 (proxy) → 127.0.0.1:5005 (rippled)
```

When `USF_PROXY_URL` is set in the environment, the verify route sends XRPL
queries to the USF node instead of the public endpoint. The proxy adds CORS
headers so it can be called from any origin.

Two proxy implementations are provided:
- `scripts/usf-proxy.js` — Node.js, no dependencies, run with `node usf-proxy.js`
- `scripts/usf-proxy.py` — Python 3, stdlib only, run with `python3 usf-proxy.py`

Either works. The Python version is preferable if Node is not available on
the server.

### Checking node status

To confirm the USF node's rippled instance is healthy:

```bash
ssh ripple.cs.usfca.edu "curl -s -X POST http://127.0.0.1:5005 \
  -H 'Content-Type: application/json' \
  -d '{\"method\":\"server_info\"}' | python3 -m json.tool | head -30"
```

A healthy response includes `"server_state": "full"` or `"proposing"`,
indicating the node is fully synced and participating in consensus.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) | React with server components and API routes in one framework |
| Database | Firebase Firestore | Managed NoSQL document database; real-time capable, generous free tier |
| File storage | Firebase Storage (Google Cloud Storage) | Photo evidence stored in GCS, public URL included in hash |
| Blockchain | XRP Ledger | Fast finality, low cost, permanent memo storage, open validator network |
| Hosting | Vercel | Zero-config deployment, serverless API routes, free tier |
| Map | Leaflet + react-leaflet | Open-source, no API key required, works with OpenStreetMap tiles |
| XRPL SDK | xrpl.js (npm: xrpl) | Official JS library for wallet management and transaction submission |

---

## Setup — run your own instance

### 1. Clone and install

```bash
git clone https://github.com/natyhl/eviair.git
cd eviair
npm install
```

### 2. Create accounts (all free)

- **Firebase** — console.firebase.google.com → Add project → name it, disable
  Google Analytics if not needed → Create project
- **Vercel** — vercel.com → sign up with GitHub
- **XRPL testnet wallet** — visit faucet.altnet.rippletest.net, click "Generate
  testnet credentials". You get an address and seed pre-funded with 1000 test XRP.
- **XRPL mainnet wallet** — generate a keypair:
  ```bash
  node -e "
    const xrpl = require('xrpl')
    const w = xrpl.Wallet.generate()
    console.log('Address:', w.address)
    console.log('Seed:   ', w.seed)
  "
  ```
  Fund it with at least 11 XRP: 10 XRP minimum reserve (required by the
  ledger for all accounts) plus enough for transaction fees (~0.000012 XRP
  each, so thousands of submissions per XRP).

### 3. Set up Firebase

#### Firestore database
In the Firebase console:
- **Firestore Database → Create database** → start in production mode
- Choose a region close to your users (e.g. `us-central1`)

Add these **Firestore Security Rules** (allows public read and insert,
no update or delete):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /readings/{id} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

#### Composite index (required for the map query)
The map fetches readings filtered by `created_at` and ordered by `created_at`.
Firestore requires a composite index for this. Either:
- Run the app once and click the index link in the error message (easiest), or
- Go to **Firestore → Indexes → Add index**:
  - Collection: `readings`
  - Field 1: `created_at` — Ascending
  - Field 2: `created_at` — Descending
  - Query scope: Collection

#### Firebase Storage
- **Storage → Get started** → production mode
- Add these Storage Security Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /reading-photos/{file} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

#### Service account (for server-side API routes)
- **Project Settings → Service accounts → Generate new private key**
- Download the JSON file — you'll extract values from it for your env variables

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `FIREBASE_PROJECT_ID` | Service account JSON → `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Service account JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | Service account JSON → `private_key` (include the full string with `\n`) |
| `FIREBASE_STORAGE_BUCKET` | Firebase console → Storage → bucket name (e.g. `eviair.firebasestorage.app`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project Settings → Your apps → Web app → Config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same config object |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same config object |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same config object |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same config object |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same config object |
| `XRPL_SEED` | Your wallet seed (starts with `s`). Never expose this client-side. |
| `NEXT_PUBLIC_XRPL_EXPLORER` | `https://testnet.xrpl.org/transactions` (testnet) or `https://xrpscan.com/tx` (mainnet) |
| `USF_PROXY_URL` | Optional — `http://ripple.cs.usfca.edu:3001` if the proxy is running |

> **Note on `FIREBASE_PRIVATE_KEY`:** the private key contains literal `\n`
> characters. In `.env.local` paste it exactly as it appears in the JSON,
> including the surrounding quotes and newline escapes. The API routes replace
> `\\n` → `\n` at runtime.

> **Note on `NEXT_PUBLIC_FIREBASE_*` variables:** Firebase client-side config
> keys are designed to be public. They identify your Firebase project but do
> not grant write access on their own — Firestore and Storage Security Rules
> control what operations are permitted.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000. Submit a reading, note the transaction ID, then
use the Verify page to confirm the hash matches.

### 6. Deploy to Vercel

Push to GitHub, then:
- vercel.com → New Project → import your repo
- Add all environment variables under Project Settings → Environment Variables
- Deploy

---

## Switching to XRPL mainnet

In `lib/xrpl.js` change the WebSocket URL:

```js
// Testnet (current)
const client = new Client('wss://s.altnet.rippletest.net:51233')

// Mainnet
const client = new Client('wss://xrplcluster.com')
```

Update `NEXT_PUBLIC_XRPL_EXPLORER` to `https://xrpscan.com/tx`.

Update `XRPL_SEED` to a mainnet wallet seed. The wallet must hold at least
11 XRP (10 XRP ledger reserve + fees). Each submission costs ~0.000012 XRP,
so 1 XRP covers roughly 80,000 submissions.

---

## Running the USF proxy

### Option A — Python (recommended, no dependencies)

```bash
ssh ripple.cs.usfca.edu
python3 scripts/usf-proxy.py
```

To keep it running after disconnect:

```bash
nohup python3 scripts/usf-proxy.py > proxy.log 2>&1 &
echo $!   # save this PID to stop it later
```

### Option B — Node.js

```bash
ssh ripple.cs.usfca.edu
node scripts/usf-proxy.js

# Background:
nohup node scripts/usf-proxy.js > proxy.log 2>&1 &
```

### Verify the proxy is working

```bash
curl -X POST http://ripple.cs.usfca.edu:3001 \
  -H 'Content-Type: application/json' \
  -d '{"method":"server_info","params":[]}'
```

A successful response contains `"server_state"` in the JSON. Then set
`USF_PROXY_URL=http://ripple.cs.usfca.edu:3001` in your Vercel environment
and redeploy.

---

## Data model (Firestore)

Readings are stored as documents in the `readings` collection. Each document
has the following fields:

| Field | Type | Description |
|---|---|---|
| `city` | string | City name — must match a city in `lib/cities.js` |
| `lat` | number | City latitude (from `lib/cities.js`) |
| `lng` | number | City longitude (from `lib/cities.js`) |
| `aqi` | number | Air Quality Index (required) |
| `pm25` | number \| null | PM2.5 particulate matter in μg/m³ |
| `pm10` | number \| null | PM10 particulate matter in μg/m³ |
| `submitter_note` | string \| null | Free-text note from submitter |
| `photo_url` | string \| null | Public GCS URL of the uploaded photo |
| `xrpl_txid` | string \| null | XRPL transaction ID — lookup key for verification |
| `data_hash` | string | SHA-256 hash of the canonical reading payload |
| `created_at` | string | ISO 8601 timestamp set at submission time |
| `validated` | boolean | Always `false` at insert; consensus computed client-side |

`data_hash` is stored both in this document and in the XRPL transaction memo.
`xrpl_txid` is used to look up the document during verification.

Unlike a SQL schema, Firestore has no enforced schema — the structure above
is maintained by the API route. The `supabase/schema.sql` file in the repo
is kept for historical reference from the earlier Supabase version of the
project.

---

## Project structure

```
eviair/
├── app/
│   ├── layout.js            root layout with Nav, metadata
│   ├── page.js              map page (home) — dynamic import, client-side Leaflet
│   ├── globals.css          global reset and base styles
│   ├── icon.svg             app favicon (dark green circle, white cloud)
│   ├── submit/
│   │   └── page.js          report form — FormData upload, XRPL anchor
│   ├── verify/
│   │   └── page.js          verify form — calls /api/verify
│   └── api/
│       ├── submit/
│       │   └── route.js     POST: photo → GCS, hash, XRPL anchor, Firestore insert
│       └── verify/
│           └── route.js     GET: XRPL memo fetch, Firestore lookup, hash comparison
├── components/
│   ├── Nav.js               fixed top navigation bar (client component)
│   ├── Map.js               Leaflet map with city markers, Firestore query (client only)
│   └── CityPopup.js         popup card with AQI stats and consensus badge
├── lib/
│   ├── cities.js            10 Indian cities with lat/lng coordinates
│   ├── firebase.js          Firebase client SDK (Firestore + Storage, public config)
│   └── xrpl.js              hashReading() and anchorToXRPL()
├── utils/
│   ├── aqi.js               aqiColor() and aqiLabel() — 6-tier AQI scale
│   └── consensus.js         computeConsensus() — pairwise 20% tolerance algorithm
├── scripts/
│   ├── usf-proxy.js         Node.js proxy for USF rippled node
│   └── usf-proxy.py         Python 3 proxy (stdlib only) for USF rippled node
├── supabase/
│   └── schema.sql           historical SQL schema from Supabase version (reference only)
├── .env.example             template for all required environment variables
└── README.md                this file
```

---

## Security notes

- `XRPL_SEED` is server-only (no `NEXT_PUBLIC_` prefix) — never sent to the browser
- `FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL` are server-only — used only in API routes via `firebase-admin`
- `NEXT_PUBLIC_FIREBASE_*` client config values are safe to expose — they identify the project but access is controlled entirely by Firestore and Storage Security Rules
- Firestore rules allow public read and create, but block update and delete — a submitted reading can never be overwritten through the client SDK
- All `target="_blank"` links include `rel="noopener noreferrer"` to prevent tab-nabbing
- Photo upload filenames are randomized server-side to prevent path traversal or filename collisions
- The verify page constructs the XRPL query server-side — the browser never directly contacts the XRPL node or the USF proxy

---

## Cities covered

Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Pune, Ahmedabad,
Lucknow, Kanpur

Expanding to additional cities requires adding entries to `lib/cities.js`.
No other changes are needed — the map, form, and database all read from
that single source of truth.

---

## License

MIT — free to use, modify, and deploy.

---

Built by **Natálie Hluší**
USF × Ripple Research Partnership · University of San Francisco · 2026
