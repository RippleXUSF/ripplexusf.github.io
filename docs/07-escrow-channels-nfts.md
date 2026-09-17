# Escrow, payment channels, and NFTs

A recurring pattern with developers new to XRPL: they think of a use
case, reach for "I'll write a smart contract to do X," and start
looking for the XRPL equivalent of Solidity. There isn't one. Not
because XRPL is missing something, but because a lot of what people write
contracts for is already a native primitive on the ledger — smaller
attack surface, no gas, no bytecode.

Three of those primitives are worth knowing before you build anything.

## Escrow

**Lock XRP until a condition is met.** Useful for time-locked
disbursements, vesting, and any deal where you want the funds committed
but not yet delivered.

An escrow has:

- A sender (the account whose XRP is locked)
- A destination (who receives it on release)
- A **FinishAfter** time — earliest moment it can be released
- A **CancelAfter** time — after this, the sender can reclaim
- Optionally a **Condition** — a crypto-condition (a preimage-hashlock)
  the fulfiller must supply to release

The three transactions:

- **EscrowCreate** — lock the funds
- **EscrowFinish** — release them (after `FinishAfter`, and providing the
  fulfillment if there's a `Condition`)
- **EscrowCancel** — reclaim them (after `CancelAfter`)

Time-locked payments, dead-man's-switch style releases, and simple HTLC
swaps all fall out of these three.

## Payment channels

**Off-chain, fast micropayments between two parties.** You open a
channel with a deposit of XRP. Then, off-chain, the sender signs
incrementally-increasing claims ("I authorize the recipient to withdraw
up to N XRP"). The recipient can redeem the latest claim on-chain
whenever they want. Only opens and closes hit the ledger — the payments
themselves are just signed messages between the two parties.

Transactions:

- **PaymentChannelCreate** — open a channel, fund it
- **PaymentChannelFund** — top it up
- **PaymentChannelClaim** — recipient claims some or all
- **PaymentChannelClose** — close the channel; unused funds return to
  sender after a settle delay

Good fit for: streaming payments, per-second billing, high-frequency
low-value transfers between the same two parties. Bad fit for:
one-shot payments to arbitrary counterparties (just use `Payment`).

## NFTs (XLS-20)

Native non-fungible tokens on XRPL. No contract, no ERC-721 ceremony.
You mint an NFT with a transaction; it sits on the minter's account
until someone accepts an offer for it.

Transactions:

- **NFTokenMint** — create the NFT. Fields include a URI (usually
  pointing to IPFS or a metadata service), flags (burnable, only-XRP,
  transferable), a `TransferFee` (percentage royalty on secondary sales,
  in units of 1/100,000), and a `TaxonID` for grouping.
- **NFTokenCreateOffer** — post a sell offer (or a buy offer)
- **NFTokenAcceptOffer** — accept an existing offer, transferring the
  NFT
- **NFTokenCancelOffer** — cancel your own offers
- **NFTokenBurn** — destroy the NFT (only works if `Flags` allow it, or
  by the current owner)

The `TransferFee` is enforced by the protocol. Royalties actually happen,
they're not a social convention — every time an XLS-20 NFT changes hands
via `NFTokenAcceptOffer`, the fee goes to the original issuer.

## The pattern

Reach for the built-in primitive before you reach for something more
complex. If you find yourself wishing XRPL had smart contracts to do X,
check whether X is already an amendment. Very often it is.
