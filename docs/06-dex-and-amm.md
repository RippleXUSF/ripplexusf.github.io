# The DEX and the AMM

The XRP Ledger has had a native decentralized exchange since day one, in
2012. It's not a smart contract, it's not a project someone built on top
— it's part of the protocol. Any account can place an order to trade any
two assets (XRP or issued currencies), and the ledger matches them.

Since the XLS-30 amendment activated, XRPL also has a native **AMM**
(automated market maker) alongside the order book, giving you two ways
to trade the same pair.

## The order book (Offers)

You place an offer with an **OfferCreate** transaction. An offer says:
"I'm willing to give up X of asset A in exchange for at least Y of asset
B." The ledger matches your offer against existing offers on the other
side of the book; whatever can't be matched immediately sits on the book
as a resting offer.

```python
from xrpl.models.transactions import OfferCreate
from xrpl.models.amounts import IssuedCurrencyAmount
from xrpl.utils import xrp_to_drops

offer = OfferCreate(
    account=wallet.address,
    taker_gets=xrp_to_drops(100),         # I give up 100 XRP
    taker_pays=IssuedCurrencyAmount(       # I want at least 50 USD
        currency="USD",
        issuer="r...issuer...",
        value="50",
    ),
)
```

Resting offers each occupy one owner-reserve slot on your account.
Cancel with **OfferCancel**.

Payment transactions can also traverse the order book automatically to
complete a cross-currency payment — the ledger's pathfinding picks the
best route across trust lines and offers.

## The AMM (XLS-30)

The order book is great when there's a market maker actively quoting
prices. When there isn't, the AMM offers a passive alternative: liquidity
providers deposit both sides of a pair into a pool, the pool prices swaps
against its own reserves using a constant-product formula, and LPs earn
a share of the trading fees.

Interactions:

- **AMMCreate** — create the pool for a new pair.
- **AMMDeposit** — provide liquidity, receive LP tokens.
- **AMMWithdraw** — burn LP tokens, get your share of the pool back.
- **Payment** — a payment through the pair automatically considers the
  AMM alongside the order book.
- **AMMVote** / **AMMBid** — governance of the pool's trading fee and the
  auction slot.

The AMM's trading fee, minimum pool sizes, and other parameters are set
by the protocol and can change via amendment. Do not hard-code them.
Read the current values from
[xrpl.org — Automated Market Makers](https://xrpl.org/docs/concepts/tokens/decentralized-exchange/automated-market-makers).

## When to use which

- **Order book** — you want a specific price, or you're a market maker
  quoting spreads, or you want to place a limit order and walk away.
- **AMM** — you're providing passive liquidity, or you're a taker and you
  just want a swap without hunting for a counterparty.

For payments and swaps, you rarely have to choose — the ledger's
pathfinding considers both. As a builder, you're picking whether to
place offers, deposit into pools, or both.
