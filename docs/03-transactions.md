# Transactions

Every action that changes ledger state — sending XRP, opening a trust
line, minting an NFT, placing an offer — is a **transaction**. Same
lifecycle every time: build → sign → submit → wait for validation.

## Anatomy

A transaction is a JSON-like object. The universal fields (that apply to
every transaction type) are:

```
{
  "TransactionType": "Payment",           // what kind of action
  "Account":         "r...sender...",     // who is signing/paying
  "Fee":             "12",                // fee in drops
  "Sequence":        42,                  // per-account counter
  "Flags":           0,                   // bit flags, type-specific
  "Memos":           [ ... ],             // optional attached data
  "SigningPubKey":   "...",               // filled in when signing
  "TxnSignature":    "..."                // filled in when signing
}
```

Then, depending on `TransactionType`, there are type-specific fields:
`Destination` and `Amount` for a `Payment`, `LimitAmount` for a
`TrustSet`, and so on.

## Sequence numbers

Each account has a **Sequence** number. The first transaction from an
account uses a specific starting sequence; each subsequent transaction
must use exactly the next integer. The ledger rejects transactions with a
sequence in the past (`tefPAST_SEQ`) or too far in the future.

You almost never set this by hand. The client library's autofill step
(`client.autofill(tx)` in `xrpl-py`, or the equivalent inside
`submit_and_wait`) reads the current sequence from the ledger and fills it
in.

Reused sequences and reused signed blobs are the most common cause of
"my transaction won't go through." A signed transaction is single-use.

## Fees

Every transaction pays a **Fee** in drops (1 XRP = 1,000,000 drops).

- The **base fee** is very small under normal load — a fraction of a cent.
- Under load, the network's queue applies **fee escalation**: transactions
  offering higher fees clear first, and the reference base fee for the
  next ledger rises.
- Failed transactions with a `tec` result code **still pay their fee** —
  this is the network's spam protection. `tem` and `tef` results (rejected
  before the ledger) do not consume a fee.

Again, don't hard-code this. Autofill queries the current fee and fills it
in.

## Signing

You sign with the account's private key (held by your `Wallet`). Signing
turns the built transaction into a signed blob and fills in
`SigningPubKey` and `TxnSignature`. Only after signing can it be
submitted.

In `xrpl-py`, the shortcut is `submit_and_wait`, which does autofill,
sign, submit, and poll for validation in one call:

```python
from xrpl.transaction import submit_and_wait
from xrpl.models.transactions import Payment
from xrpl.utils import xrp_to_drops

payment = Payment(
    account=wallet.address,
    destination="rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    amount=xrp_to_drops(10),
)
response = submit_and_wait(payment, client, wallet)
```

`submit_and_wait` returns once the transaction has been included in a
validated ledger. That's your finality — see chapter 4.

## Result codes

Every transaction result carries a code with a three-letter prefix.
Reading the prefix tells you what happened before you read the rest of
the message.

| Prefix | Meaning | Fee consumed? | Common examples |
|--------|---------|---------------|-----------------|
| `tes` | Success. `tesSUCCESS` is the only code here. | Yes | `tesSUCCESS` |
| `tec` | Included in a ledger, but the transaction failed. | **Yes** | `tecINSUFFICIENT_RESERVE`, `tecPATH_DRY`, `tecNO_DST` |
| `tef` | Failed before entering a ledger (final). | No | `tefPAST_SEQ`, `tefMAX_LEDGER` |
| `tem` | Malformed transaction — bad syntax or bad fields. | No | `temBAD_AMOUNT`, `temBAD_FEE` |
| `ter` | Retry — network is busy or a temporary condition. | No | `terQUEUED`, `terRETRY` |

Rule of thumb:

- `tes` — good.
- `tec` — the transaction reached the ledger, applied its fee, and
  intentionally did not do the thing. Look at the code to see why.
- `tef` — the ledger rejected it outright. Fix and resign.
- `tem` — you built something malformed. Fix your code.
- `ter` — try again in a moment.

The full list is at
[xrpl.org — Transaction results](https://xrpl.org/docs/references/protocol/transactions/transaction-results).
