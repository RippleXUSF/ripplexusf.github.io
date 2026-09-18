# MedVerify

A decentralized pharmaceutical supply chain tracker built on the XRP Ledger. Every custody handoff — from factory floor to dispensing counter — is anchored on-chain as a tamper-proof record. Patients scan a QR code to see the full verified journey of their medication. An AI layer flags broken chains and summarizes the custody history in plain language.

---

## Table of Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [User flows](#user-flows)
- [API reference](#api-reference)
- [Security model](#security-model)
- [Development history](#development-history)

---

## What it does

Counterfeit and diverted medications are a global public health problem. MedVerify addresses this by making the pharmaceutical supply chain transparent and verifiable at the point of dispensing.

When a manufacturer produces a drug batch, they mint a non-fungible token on the XRP Ledger encoding the batch metadata — drug name, batch number, quantity, manufacturing date. As the batch moves through the supply chain, each participant signs an on-chain transaction confirming receipt. By the time the medication reaches a patient, there is a complete, cryptographically verifiable record of every hand that touched it.

Patients scan a QR code on the packaging to see:
- Full batch details (drug, quantity, manufacture date)
- A three-step custody timeline: manufacturer → distributor → pharmacy
- An AI-generated plain-language summary of the chain
- Any detected anomalies (timestamp inversions, skipped steps)
- A direct link to the XRPL mainnet explorer to inspect the raw transactions

---

## How it works

### On-chain data model

**Batch minting (manufacturer)**
The manufacturer submits an `NFTokenMint` transaction to the XRP Ledger. The batch metadata is JSON-encoded and stored in the NFT's `URI` field as a hex string:

```json
{
  "drugName": "Amoxicillin 500mg",
  "batchNumber": "BC-2024-00142",
  "quantity": "500",
  "manufacturingDate": "2024-01-15",
  "mintedAt": "2024-01-15T09:32:11.000Z"
}
```

The resulting NFT Token ID is the canonical identifier for the batch throughout its life.

**Custody confirmation (distributor and pharmacy)**
Each confirmating party submits a `Payment` transaction from their wallet carrying a structured `Memo`:

```json
{
  "step": "distributor_received",
  "batchId": "000800006B4F...",
  "timestamp": "2024-01-16T14:22:05.000Z"
}
```

The memo type is `medverify/custody` (hex-encoded). The payment amount is 1 drop (the minimum). The transaction signer is the role's wallet — this is the cryptographic proof of custody.

**Chain reconstruction**
When the verify page loads a batch, the app:
1. Fetches the manufacturer's NFTs via `account_nfts` to find the batch data from the URI
2. Scans the distributor wallet's transaction history for a custody memo matching the batch ID
3. Scans the pharmacy wallet's transaction history for a custody memo matching the batch ID
4. Assembles a `CustodyChain` from the results and passes it to the AI analysis layer

### AI analysis

The custody chain is serialized as JSON and sent to Claude (via the Anthropic API) with a prompt instructing it to act as a pharmaceutical supply chain auditor. The model returns:
- A 1–2 sentence plain-language summary suitable for a patient
- An array of specific anomaly descriptions (empty if none)
- A trust level: `verified`, `incomplete`, or `suspicious`

Anomaly detection rules include: out-of-order timestamps, missing steps, the same actor appearing in multiple roles, and suspiciously short or long gaps between steps.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.4 (App Router, TypeScript) |
| Blockchain | XRP Ledger Mainnet via xrpl.js v4 |
| AI analysis | Anthropic Claude API (claude-opus-4-7) |
| Styling | Tailwind CSS v4 + inline styles |
| Fonts | Fraunces (display/serif), DM Mono (monospace) via Google Fonts |
| QR codes | react-qr-code |
| State | React Context (role), React useState (local UI) |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard — server component, fetches XRPL data
│   ├── DashboardShell.tsx          # Dashboard — client component, role tabs + views
│   ├── layout.tsx                  # Root layout, font loading, RoleProvider
│   ├── globals.css                 # Design tokens, body background, toast animation
│   ├── manufacture/
│   │   └── page.tsx                # Mint batch form (manufacturer)
│   ├── verify/
│   │   ├── page.tsx                # Batch lookup / search page
│   │   └── [tokenId]/
│   │       └── page.tsx            # Batch result — client component with inline confirm
│   ├── distribute/
│   │   └── page.tsx                # Standalone distributor confirm page (legacy)
│   ├── pharmacy/
│   │   └── page.tsx                # Standalone pharmacy confirm page (legacy)
│   └── api/
│       ├── mint/route.ts           # POST — mint NFT on XRPL
│       ├── confirm/route.ts        # POST — record custody confirmation
│       ├── custody/[tokenId]/      # GET  — fetch custody chain for a batch
│       ├── analyze/[tokenId]/      # GET  — run AI analysis on a custody chain
│       └── wallet/route.ts         # GET  — return manufacturer wallet address
├── components/
│   ├── Nav.tsx                     # Sticky nav, role-aware links, role indicator
│   ├── RoleContext.tsx             # React Context for global role state
│   └── Icons.tsx                   # Inline SVG icon components (Tabler-style)
└── lib/
    ├── xrpl.ts                     # All XRPL interactions: mint, confirm, fetch chains
    └── gemini.ts                   # AI analysis via Anthropic Claude API
```

---

## Getting started

### Prerequisites

- Node.js 18+
- Three funded XRPL mainnet wallets (manufacturer, distributor, pharmacy)
- An Anthropic API key

### Fund mainnet wallets

Create and fund three XRPL mainnet wallets. You will need:
- The **seed** for the manufacturer wallet (used server-side for signing mints)
- The **seed** for the distributor wallet (used server-side for signing confirmations)
- The **seed** for the pharmacy wallet (used server-side for signing confirmations)
- The **address** for the distributor wallet (used as payment destination)
- The **address** for the pharmacy wallet (used as payment destination)

### Install dependencies

```bash
cd medverify-app
npm install
```

---

## Environment variables

Create a `.env.local` file in `medverify-app/`:

```env
# Manufacturer wallet
XRPL_MANUFACTURER_SEED=sEd...

# Distributor wallet
XRPL_DISTRIBUTOR_SEED=sEd...
XRPL_DISTRIBUTOR_ACCOUNT=r...

# Pharmacy wallet
XRPL_PHARMACY_SEED=sEd...
XRPL_PHARMACY_ACCOUNT=r...

# AI analysis
ANTHROPIC_API_KEY=sk-ant-...
```

> All signing is server-side. Wallet seeds never leave the server and are never sent to the browser.

---

## Running the app

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## User flows

The app has three roles. On the dashboard, select your role using the tab cards at the top.

### Manufacturer

1. Select **Manufacturer** on the dashboard
2. Click **Mint batch** in the nav
3. Fill in: drug name, batch number, quantity, manufacturing date
4. Click **Mint batch record** — this submits an `NFTokenMint` transaction to XRPL
5. Copy the resulting **Token ID** (64-character hex string) — this is what you share with your distributor
6. The batch appears immediately in the manufacturer dashboard

### Distributor

1. Select **Distributor** on the dashboard — pending batches appear under "Awaiting your confirmation"
2. Click **Confirm receipt** on any row to confirm directly from the dashboard
   — or — click **Confirm receipt** in the nav, enter the Token ID from the manufacturer, and confirm from the verify page
3. An on-chain `Payment` transaction with a custody memo is recorded from the distributor wallet
4. Share the same Token ID with the pharmacy

### Pharmacy

1. Select **Pharmacy** on the dashboard — batches ready for the pharmacy step appear under "Ready to confirm"
2. Click **Confirm & QR** on any row
3. A QR code appears inline — print it on the medication packaging
4. The QR links to `/verify/[tokenId]` which is the patient-facing verification page

### Patient (no role required)

1. Scan the QR code on the packaging
2. The verify page shows: batch info, three-step custody timeline, AI summary, XRPL transaction link
3. If any step is missing or timestamps are out of order, an anomaly alert is shown

### Inline verify flow

Any role can navigate to **Verify**, enter a Token ID, and:
- View the chain as a visitor (read-only)
- Confirm as distributor or pharmacy directly on the page — the "I am a:" role selector pre-fills from the nav context
- After pharmacy confirmation, the QR code appears inline on the verify page

---

## API reference

All routes are under `/api/`.

### `POST /api/mint`

Mints a new batch NFT on XRPL.

**Body:**
```json
{
  "drugName": "Amoxicillin 500mg",
  "batchNumber": "BC-2024-00142",
  "quantity": "500",
  "manufacturingDate": "2024-01-15"
}
```

**Response:**
```json
{
  "tokenId": "000800006B4F...",
  "txHash": "A1B2C3...",
  "manufacturerAddress": "rXXX...",
  "batchData": { ... }
}
```

Token ID extraction uses a three-tier approach: `meta.nftoken_id` (modern XRPL nodes), AffectedNodes set-difference scan, URI match fallback.

### `POST /api/confirm`

Records a custody confirmation on-chain.

**Body:**
```json
{
  "role": "distributor",
  "tokenId": "000800006B4F..."
}
```

`role` must be `"distributor"` or `"pharmacy"`.

### `GET /api/custody/[tokenId]`

Fetches the full custody chain for a batch. Scans manufacturer NFTs and distributor/pharmacy transaction histories.

**Response:** `CustodyChain` object with `batchData` and `events[]`.

### `GET /api/analyze/[tokenId]`

Fetches custody chain and runs AI analysis. Called client-side after the chain loads (non-blocking).

**Response:**
```json
{
  "summary": "This batch of Amoxicillin was manufactured on Jan 15...",
  "anomalies": [],
  "trustLevel": "verified"
}
```

### `GET /api/wallet`

Returns the manufacturer wallet address (public, not the seed). Used to populate the read-only wallet field on the mint form.

---

## Security model

### What the blockchain provides

Each custody event is a transaction cryptographically signed by the specific role's wallet private key. Forging a distributor confirmation requires possessing the distributor wallet's private key — knowing the Token ID alone is not sufficient. The on-chain record is immutable.

### What the demo does differently

For demonstration purposes, all three wallet keys are held server-side in `.env.local`. The web UI lets any user trigger a confirmation for any role by selecting it on the dashboard. The server signs the transaction using the pre-loaded key for that role.

This is an intentional trade-off: it allows a single person to demonstrate the complete three-step chain in one browser window without three separate devices or wallets.

### What production would look like

In a production deployment, each organization would connect their own XRPL wallet using [XUMM (Xaman)](https://xumm.app), the dominant XRPL mobile wallet. The flow would be:

1. Distributor opens the app and connects via XUMM
2. Their wallet address is registered in the system as the authorized distributor
3. When they confirm receipt, a signing request is sent to their XUMM app
4. They approve on their device — the private key never leaves their phone
5. The transaction is submitted with their cryptographic signature

Under this model, possessing the Token ID grants no signing authority. The Token ID is just an identifier — the chain is secured by wallet authentication.

---

## Development history

This section documents the design decisions made during development, including directions considered and reasons for the choices made.

#### Framework choice — Next.js App Router

The app was scaffolded with Next.js 16 (App Router), TypeScript, and Tailwind CSS v4. The App Router was chosen over Pages Router for three specific reasons relevant to this project: server components allow XRPL queries to run directly on the server without a separate API call (used in the dashboard), route handlers (`/api/*`) colocate API logic with the pages that call them, and dynamic route segments (`/verify/[tokenId]`) map cleanly to the per-batch verification URL pattern patients scan from QR codes.

#### NFT data encoding — inline URI over IPFS

The most consequential early decision was how to store batch metadata on-chain. Two options were considered:

1. Store data off-chain (IPFS or a database), put the CID or URL in the NFT URI field
2. Hex-encode the JSON directly into the URI field

Option 1 is the standard NFT approach but introduces an external dependency — if the IPFS pin lapses or the database goes down, the NFT URI resolves to nothing and the chain record is effectively broken. For a pharmaceutical authenticity system this is unacceptable: the on-chain record must be self-contained and permanently readable.

Option 2 was chosen. The batch JSON is serialized and hex-encoded into the `URI` field of the `NFTokenMint` transaction. This means the full batch metadata lives entirely on the XRP Ledger with no off-chain dependencies. The tradeoff is the 512-byte URI limit, which constrains field length — acceptable for structured pharmaceutical metadata.

#### Custody confirmation mechanism — Payment+Memo over NFT transfers

Two on-chain mechanisms were evaluated for recording distributor and pharmacy custody events.

**NFT transfer approach:** The manufacturer mints the NFT, creates a sell offer targeted at the distributor wallet, the distributor accepts it (taking ownership), then creates a new offer for the pharmacy, and so on. Under this model, the NFT's ownership history is the chain of custody.

This was rejected for three reasons. First, it requires a two-transaction round trip per step (offer creation + offer acceptance), doubling the number of XRPL calls and the surface area for partial failures. Second, XRPL NFT ownership history is not directly queryable — reconstructing it requires fetching and diffing ledger state across multiple snapshots, which is expensive. Third, it changes the semantic of the NFT: batch records are identity records, not tradeable assets. Transferring them between wallets to simulate custody implies the wrong thing.

**Payment+Memo approach (chosen):** Each confirming party submits a `Payment` transaction (1 drop, the minimum non-zero amount) from their wallet. The payment carries a structured `Memo` containing the step name, batch Token ID, and timestamp. The transaction's cryptographic signature serves as the custody proof — only the entity holding the distributor private key can produce a valid distributor confirmation.

Chain reconstruction queries each wallet's transaction history once via `account_tx` and scans for custody memos matching the Token ID. This is a linear scan over recent transactions — acceptable for demo scale, and the same pattern used by XRPL payment channel monitoring in production systems.

#### NFT flags — tfBurnable only

The `NFTokenMint` transaction supports a set of flags controlling transferability and burning rights. The initial mint uses only `tfBurnable` (flag value `1`), which allows the issuing wallet (the manufacturer) to burn the NFT if a batch is recalled or invalidated. The `tfTransferable` flag was intentionally omitted: medication batch records are not assets to be traded; they are identity records for a specific batch, and transferring them to another wallet would break the chain reconstruction logic that uses the issuer wallet to find batches.

#### Server-side signing — seeds never leave the server

All XRPL transaction signing happens inside Next.js API route handlers. Wallet seeds are loaded from `.env.local` at runtime via `process.env`. The browser never sees a seed or private key — it only receives the transaction hash and token ID after the server has submitted and confirmed the transaction.

This is the correct security boundary for a web app. The alternative (client-side signing with xrpl.js in the browser) would require delivering a seed or private key to every browser that loads the page, which is not viable even for a demo.

#### Mainnet wallet provisioning

Three XRPL mainnet wallets (manufacturer, distributor, pharmacy) were created and funded with real XRP. Seeds are stored in `.env.local` and loaded server-side at runtime. The app connects to `wss://xrplcluster.com` (the Cloudflare-backed public mainnet cluster) for all on-chain reads and writes.

#### Concept pivot — pharmacy-centric to supply chain

The original model had a single role (pharmacy/issuer) that minted NFTs for batches it received from unverified upstream sources. Fields were: drug name, manufacturer name, batch number, expiry date, and origin (country/facility). The patient scanned a QR code to confirm the batch was real — but "real" meant only that the pharmacy had registered it, not that the upstream chain was verified.

This was replaced with a three-party supply chain model: manufacturer mints the initial batch record, distributor and pharmacy each sign on-chain confirmations. The patient's QR code now shows the full verified chain, not just a registration.

The field set changed accordingly. **Manufacturer name** was dropped — the signing wallet address *is* the manufacturer identity claim; a name string adds nothing a counterfeit could not also supply. **Expiry date** was dropped — it is a derived attribute (regulatory shelf-life from manufacture date) rather than something known with certainty at production time. **Origin** was dropped for the same reason as manufacturer name — the wallet's XRPL address is a stronger provenance signal than a freetext field. **Quantity** was added as a supply chain–relevant field the manufacturer genuinely knows at mint time. **Manufacturing date** replaced the implicit `mintedAt` timestamp as the authoritative record of when the batch was produced.

### AI analysis — Claude via Anthropic SDK

The AI layer uses Claude (claude-opus-4-7) via the Anthropic SDK. The original spec named Gemini Flash as the target model; during implementation Claude was chosen instead because the Anthropic SDK's structured output handling and system prompt fidelity made the auditor persona more reliable in testing.

The prompt instructs Claude to behave as a pharmaceutical supply chain auditor and return structured JSON. The response is parsed and displayed as: a summary paragraph (for the patient), a list of specific anomaly strings (for the verify page alert box), and a trust level (`verified`, `incomplete`, or `suspicious`) used to determine the status badge color.

Anomaly rules in the prompt: out-of-order timestamps between steps, missing required steps, the same wallet address appearing in multiple roles, and gaps between steps that are implausibly short (sub-minute) or long (over 30 days).

#### The gap between dashboard and verify anomaly detection

The two anomaly layers are not in sync. The dashboard runs a local timestamp comparison — it only catches cases where a later step has an earlier timestamp than the step before it. It misses everything else: skipped steps, duplicate actors, implausible gaps. A batch that went manufacturer → pharmacy with no distributor in between would show no anomaly flag on the dashboard at all, because the timestamps are still in order.

The verify page catches all of this via Claude, but only when someone actively opens that specific batch. The dashboard anomaly count and the AI's `trustLevel` can therefore disagree — a batch could be `suspicious` on the verify page while showing clean on the dashboard.

In an ideal setup the two would be unified: Claude analysis would run once per batch when it reaches a terminal state (all three steps confirmed or a timeout elapsed), the result would be stored in a database, and the dashboard would read from that cache. The dashboard anomaly count would then reflect the same logic as the per-batch AI verdict, and there would be no discrepancy between the two views.

### What was intentionally left out

Several features from the original design were deprioritized:

**XUMM wallet connection.** Integrating XUMM would make the app genuinely multi-party — each role would need to connect their real wallet to sign transactions. This was left out because it requires a XUMM developer API key, a mobile device for approval flows, and significantly more auth infrastructure. The server-side key model was chosen as a demo-appropriate substitute, with the understanding that this would be the first thing replaced in a production version.

**Patient QR scanning UX.** The verify page works for patients but is identical to what the pharmacy sees. A patient-specific view (no role selector, no action panels, just the trust signal and chain summary) would be cleaner.

**Pagination and search.** The dashboard `fetchAllBatches()` fetches up to 400 NFTs and 400 transactions per wallet. For a real deployment with thousands of batches this would need pagination, indexing, or a dedicated database layer.

**Anomaly detection via AI on the dashboard.** The dashboard uses a local heuristic (timestamp comparison) to flag anomalies. Running Claude analysis on every batch at dashboard load time would be too slow and expensive. In production, anomaly analysis would run asynchronously when batches are created/updated and results would be cached.
