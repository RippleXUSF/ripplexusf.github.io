# Ripple, the XRP Ledger, and XRP

If you take one thing from these docs, take this: **Ripple, the XRP Ledger,
and XRP are three different things.** Newcomers conflate all three, and
almost every confused blog post or bad-faith tweet you'll read about
"Ripple" is really about one of the other two.

## The three things

**Ripple** is a company (Ripple Labs, Inc.). It sells payment and custody
software, holds a large amount of XRP, employs engineers who contribute
heavily to the XRPL codebase, and runs marketing. It is a normal for-profit
company. It has customers, product managers, and a legal department.

**The XRP Ledger (XRPL)** is an open, permissionless blockchain. It first
ran in 2012 — predating most of Ripple's current products, and predating
Ethereum. Anyone can run a node, submit transactions, and read the state.
Nobody needs Ripple's permission to build on it. The reference server
(`rippled`) is open-source; validators are run by universities, exchanges,
individuals, Ripple, and others.

**XRP** is the native asset of the XRP Ledger. It is used to pay
transaction fees, and it acts as a bridge asset inside the ledger's
built-in DEX. It exists on the ledger, not in a smart contract. There is a
fixed supply that was created at genesis.

## What Ripple does not control

- Ripple does not run the XRP Ledger. It runs some validators (like many
  other organizations), and it contributes code, but it cannot mint XRP,
  freeze accounts, reverse transactions, or unilaterally change the
  protocol.
- Protocol changes happen through the amendment process — validators vote
  on proposed changes over a two-week window. Ripple's validators are a
  minority of the default UNL.
- Your account and your funds on the XRPL are not held by Ripple. They live
  on-chain. Ripple has no key that lets it move them.

## What Ripple does do

- Builds software (payment products, custody products) that uses the XRPL
  and, in some cases, other rails.
- Employs a large share of the core protocol engineers.
- Holds a large XRP treasury (this is public and disclosed).
- Funds grants, hackathons, and developer relations for the XRPL ecosystem.

## Why this matters when you read other docs

Half the confusion in blockchain writing about XRP is people using "Ripple"
when they mean "the XRP Ledger" or "XRP" — including in Ripple's own older
marketing. When a source says "Ripple confirms transactions in 4 seconds,"
they mean the ledger does. When a source says "Ripple is centralized,"
they're usually making a category error: Ripple the company is
centralized, in the sense that any company is; the XRPL is not owned by
it.

Keep the three separate as you read the rest of these docs and the
official material at [xrpl.org](https://xrpl.org).
