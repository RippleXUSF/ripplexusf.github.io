# Trust lines and issued currencies

On Ethereum, if you want to issue a token, you write an ERC-20 contract
and deploy it. That contract is the token: it holds a map of address →
balance, and every transfer is a contract call.

**The XRP Ledger has no smart contracts, and issued currencies are not
contracts.** Nobody writes and deploys anything to create a token on
XRPL. Issuance is a native protocol primitive.

This is the single mental-model shift that trips up developers coming
from EVM chains. Take a minute with it.

## The primitive: trust lines

To hold a non-XRP asset on the XRPL, your account must have a **trust
line** to the issuer of that asset. A trust line is a bidirectional
relationship between two accounts for a specific currency code, with a
**limit** — the maximum you're willing to hold from that issuer — and a
running **balance**.

Under the hood, a trust line is a `RippleState` ledger object shared by
the two accounts.

You create one with a `TrustSet` transaction:

```python
from xrpl.models.transactions import TrustSet
from xrpl.models.amounts import IssuedCurrencyAmount

trust_set = TrustSet(
    account=my_wallet.address,
    limit_amount=IssuedCurrencyAmount(
        currency="USD",
        issuer="r...issuer...",
        value="1000",     # I trust this issuer for up to 1000 USD
    ),
)
```

Once the trust line exists, the issuer can send you their USD, and you
can hold and transfer up to your limit.

## How issuance works

An "issuer" is just a regular account. To issue USD:

1. The issuer's account exists on the ledger.
2. A holder creates a trust line from their account to the issuer for
   `USD`.
3. The issuer sends a `Payment` for the amount of USD to the holder.

That's it. There's no contract. The ledger tracks the balance in the
`RippleState` object between the two accounts. If the holder wants to
send that USD onward to another user, that user must also have a trust
line to the same issuer.

Issued currencies are, by design, IOUs. The USD on-chain is a claim
against the issuer. The credibility of that claim depends on the issuer
being someone you actually trust to redeem it. This is a feature — it
maps to how correspondent banking already works — not a bug.

## Rippling

If two accounts trust the same issuer, and a payment can find a path
through that issuer, balances can move across trust lines to complete the
payment. This is called **rippling**, and it's what gives the ledger its
name.

Rippling is powerful but occasionally surprising: if you're an issuer and
you don't want balances rippling through you in unintended ways, set the
`NoRipple` flag on your trust lines.

## Practical takeaways

- No contract deployment, no ABI, no `approve`/`transferFrom` dance.
- To receive a non-XRP asset, the recipient needs a trust line first.
  Sending fails with `tecPATH_DRY` or `tecNO_LINE` if it isn't there.
- Every trust line raises the owner reserve on the account that holds it
  (see chapter 2).
- To stop holding an asset, set the trust line's limit to 0 (and its
  balance to 0) and it becomes eligible for cleanup.
