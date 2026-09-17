# Accounts and reserves

Every actor on the XRP Ledger is an **account**. An account is identified
by an address that starts with `r` (like `rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe`).
Accounts hold XRP, own trust lines to issued currencies, place offers on
the DEX, hold NFTs, and so on.

An account does not exist on the ledger until it has been funded. Sending
XRP to a fresh address is what creates the account entry.

## The reserve, and why your first project fails

An account cannot spend all of its XRP. It has to keep a minimum balance
locked. That locked amount is the **reserve**. The reserve is not a fee —
it is not paid to anyone — it just sits there for as long as the account
(or the objects it owns) exist.

Reserve has two parts:

- **Base reserve** — the minimum XRP an account must hold in order to
  exist on the ledger at all.
- **Owner reserve** — an additional amount added to the base reserve for
  each object the account owns. Each trust line, each open offer on the
  DEX, each NFT page, each escrow, each signer list — each one raises the
  owner reserve by a fixed increment.

You can freely spend anything above `base_reserve + (owner_count *
owner_reserve_increment)`. You cannot spend below it.

## The classic first-project failure

You fund a Testnet account with 10 XRP, try to send all 10 XRP out, and
the transaction fails with `tecINSUFFICIENT_RESERVE` or the payment gets
rejected for taking the balance below the reserve. You are not doing
anything wrong — the reserve is holding some of your XRP in place.

The same thing happens on Mainnet at a larger scale: you fund an account,
open a few trust lines and offers, and later you cannot delete the account
or move all the XRP out because every object you created bumped the owner
reserve.

The fix is to close (delete offers, remove trust lines, burn NFTs) the
objects raising the owner reserve, and then move the excess.

## Do not hard-code the numbers

Reserve amounts are set by the protocol and **can change via amendment**.
They have changed in the past — usually downward, as the price of XRP
rose. Any doc, tutorial, or Stack Overflow answer that hard-codes a
specific reserve amount is already at risk of being stale.

Always check the current values at the official reference:
[xrpl.org — Reserves](https://xrpl.org/docs/concepts/accounts/reserves).
You can also read them live from the ledger via a `server_info` request.

## Practical takeaway

- Fund every account you create with more than just the reserve. A few
  extra XRP for fees and objects saves you a lot of debugging.
- If you get `tecINSUFFICIENT_RESERVE`, you are trying to leave the
  account below its required minimum. Count its objects.
- Before deleting an account (`AccountDelete`), you must first remove
  everything it owns.
