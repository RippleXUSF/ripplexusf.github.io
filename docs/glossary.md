# Glossary

Quick reference for the terms that show up throughout these docs and the
official XRPL reference.

### account
An entity on the XRP Ledger, identified by an address starting with `r`.
Holds XRP and can own trust lines, offers, NFTs, escrows, etc. Comes into
existence when it is first funded above the base reserve.

### address
The public identifier of an account. Starts with `r`. Safe to share.

### AMM
Automated market maker. A native XRPL primitive (activated by the XLS-30
amendment) that provides pool-based liquidity for a currency pair
alongside the order book. See chapter 6.

### amendment
The protocol upgrade mechanism. Validators vote on proposed changes over
a rolling two-week window; if a supermajority supports it, the amendment
activates. Reserve amounts, AMM parameters, and new transaction types all
land through amendments.

### base reserve
The minimum XRP an account must hold in order to exist on the ledger. Set
by the protocol; can change via amendment. See chapter 2.

### DEX
Decentralized exchange. On XRPL, refers to the native order book that has
been part of the ledger since 2012.

### drops
The smallest unit of XRP. **1 XRP = 1,000,000 drops.** All XRP amounts in
protocol-level fields are expressed in drops as strings.

### escrow
A native primitive for locking XRP until a time or crypto-condition is
met. See chapter 7.

### faucet
A service that gives out free XRP on a test network (Testnet or Devnet).
Used for development. Has no equivalent on Mainnet.

### fee
The drops burned by a transaction to pay for network resources.
Auto-filled by client libraries in normal use. See chapter 3.

### hash (transaction hash)
A unique fingerprint identifying a signed transaction. A 64-character
hexadecimal string. Used to look up the transaction on-chain regardless
of who is asking.

### issued currency
A non-XRP asset on the ledger, tracked as a balance on a trust line
between the issuer and holder. Redeemability depends on the issuer.

### issuer
The account that stands behind an issued currency. When you hold `USD`
issued by `r...`, you hold an IOU redeemable against that specific
account.

### JsonRpcClient
The Python client that speaks JSON-RPC over HTTP to a `rippled` server.

### ledger
A snapshot of the ledger state at a point in time. Closes every few
seconds. **Closed ledger** — proposed but not yet agreed upon.
**Validated ledger** — supermajority of trusted validators agreed; final
and irreversible.

### memo
Optional arbitrary data attached to a transaction. Not interpreted by
the protocol; useful for on-chain receipts, references, or messages.

### NFT (XLS-20)
Native non-fungible token on XRPL. Minted, transferred, and burned via
`NFToken*` transactions; supports on-protocol royalties via
`TransferFee`. See chapter 7.

### offer
A resting order on the native order book. Created with `OfferCreate`,
canceled with `OfferCancel`. Each open offer raises the owner reserve.

### owner reserve
An additional reserve requirement added to an account for each object it
owns (trust line, offer, NFT page, escrow, signer list, etc.). Set by the
protocol; can change via amendment. See chapter 2.

### payment channel
A native primitive for fast off-ledger micropayments between two parties,
settled on-chain when either side chooses. See chapter 7.

### result code
The three-letter-prefix code returned by every transaction. Prefix
meanings:

- **tes** — success (`tesSUCCESS` is the only one)
- **tec** — included in a ledger, but failed. **The fee is still charged.**
  Example: `tecPATH_DRY` — no path exists to deliver the payment, usually
  a missing trust line on the receiving side.
- **tef** — failed before entering a ledger; final. Example:
  `tefPAST_SEQ`.
- **tem** — malformed transaction; fix your code. Example:
  `temBAD_AMOUNT`.
- **ter** — retry; temporary condition. Example: `terQUEUED`.

See chapter 3.

### rippling
The default behavior where balances can flow between trust lines that
share an issuer. Enables cross-currency payments; can be disabled per
trust line with the `NoRipple` flag.

### RippleState
The ledger object that stores the balance and limits of a trust line
between two accounts for a given currency.

### seed
The secret from which an account's private key is derived. Never share
this. Anyone with it controls the account.

### sequence number
The per-account transaction counter. Must strictly increment. Auto-filled
by client libraries. Reused sequences result in `tefPAST_SEQ`.

### submitted vs. validated
**Submitted** — sent to the network; outcome unknown. **Validated** —
included in a supermajority-agreed ledger; final. Wait for validation
before treating a transaction as done. See chapter 4.

### Testnet
The public practice network. Free XRP from the faucet, same protocol,
zero real value. Where everything in these docs runs.

### trust line
A bidirectional account-to-account relationship for a specific issued
currency, with a limit and a balance. Required before you can hold a
non-XRP asset. See chapter 5.

### UNL (Unique Node List)
The list of validators whose proposals a given validator listens to when
computing consensus. Most operators use a default UNL from a trusted
publisher. See chapter 4.

### validator
A `rippled` server participating in consensus by proposing and voting on
ledgers. Anyone can run one. Validators do not earn block rewards.

### wallet
In the SDK, the object holding the keypair and providing sign operations.
In protocol terms, the underlying account plus its keys.

### XRP
The native asset of the XRP Ledger. Used to pay fees, act as a bridge in
pathfinding, and satisfy the reserve. Has a fixed supply established at
genesis.

### XRPL
The XRP Ledger. The open blockchain. Distinct from Ripple (the company)
and XRP (the asset). See chapter 1.
