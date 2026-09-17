# Consensus

Bitcoin uses proof-of-work: miners burn electricity racing to find a hash,
and whoever wins gets to propose the next block. Ethereum (post-Merge) and
most modern chains use proof-of-stake: validators lock up capital, and the
protocol picks proposers weighted by their stake.

**The XRP Ledger uses neither.** There is no mining. There is no staking.
Validators do not earn block rewards — they run because their operators
(exchanges, universities, custodians, Ripple, individuals) want a
trustworthy view of the ledger for their own use.

## How it actually works, conceptually

Validators propose candidate sets of transactions for the next ledger.
They exchange proposals with the other validators they trust. Through a
few rounds of proposal exchange, the trusted validators converge on the
same set of transactions to apply. Once a supermajority agrees on the
resulting ledger, it becomes **validated** — final and irreversible.

Each validator does not trust every validator on the network. It trusts a
list — its **Unique Node List (UNL)**. The UNL is the set of validators
whose proposals this validator will listen to and count toward
supermajority. Most operators run with the default UNL published by a
trusted publisher, which contains a diverse group of well-known
validators. You can pick a different UNL if you want, but the security
model depends on validators picking overlapping lists.

That's it. No proof of work, no staking, no leader election. Trust is
imported via the UNL; agreement emerges from a few rounds of proposal
exchange; ledgers close every few seconds.

## "Submitted" vs "validated"

The most important distinction for a developer:

- **Submitted** — the transaction has been broadcast to the network. It
  might succeed, might fail, might not get in for a while. Don't act on
  this yet.
- **Validated** — the transaction has been included in a ledger that a
  supermajority of trusted validators agreed on. This is final.
  Irreversible. Nothing on the XRPL will ever undo it.

Finality on XRPL is **binary and fast**. There's no probabilistic finality
("wait 6 confirmations"). A ledger is either validated or it isn't. Under
normal conditions this happens every 3–5 seconds.

That's why `submit_and_wait` exists in the client libraries — you almost
always want to wait for validation before showing a user "payment
complete."
