# Your first transaction

End-to-end: install the Python SDK, fund a wallet from the Testnet
faucet, send some XRP to another address, and look up the resulting
transaction in the block explorer. Everything here runs on **Testnet** —
fake XRP, no real value.

## 1. Install xrpl-py

You need Python 3.7+.

```bash
pip install xrpl-py
```

## 2. Connect to the Testnet

```python
from xrpl.clients import JsonRpcClient

TESTNET_URL = "https://s.altnet.rippletest.net:51234"
client = JsonRpcClient(TESTNET_URL)
```

`JsonRpcClient` is a thin HTTP client. Every request goes to a public
Testnet server.

## 3. Fund a wallet from the faucet

The Testnet faucet gives out free test XRP. `generate_faucet_wallet`
creates a fresh keypair and calls the faucet in one step — you get back a
`Wallet` object ready to sign transactions.

```python
from xrpl.wallet import generate_faucet_wallet

sender_wallet = generate_faucet_wallet(client, debug=True)
print("Sender address:", sender_wallet.address)

# Make a second wallet so we have something to send TO
receiver_wallet = generate_faucet_wallet(client, debug=True)
print("Receiver address:", receiver_wallet.address)
```

Both accounts now exist on the Testnet ledger and have been funded.

## 4. Send XRP

Build a `Payment`, then call `submit_and_wait`. That single call fills in
the fee and sequence, signs with the sender's key, submits to the
network, and blocks until the transaction is included in a validated
ledger.

```python
from xrpl.models.transactions import Payment
from xrpl.transaction import submit_and_wait
from xrpl.utils import xrp_to_drops

payment = Payment(
    account=sender_wallet.address,
    destination=receiver_wallet.address,
    amount=xrp_to_drops(10),      # send 10 XRP
)

response = submit_and_wait(payment, client, sender_wallet)

result = response.result["meta"]["TransactionResult"]
tx_hash = response.result["hash"]

print("Result:", result)      # want: tesSUCCESS
print("Hash:  ", tx_hash)
```

If `Result` prints `tesSUCCESS`, the XRP has moved. That result is final
— see chapter 4 on what "validated" means.

## 5. Look it up in the explorer

Copy the hash from your terminal and open:

```
https://testnet.xrpl.org/transactions/<paste-your-hash-here>
```

You'll see the full transaction record, live from the blockchain: the
sender, the destination, the fee that was paid, the ledger it was
included in, and the timestamp. That's a real on-chain record — just on
the practice network.

## What to try next

- Check the receiver's balance with an `AccountInfo` request and confirm
  it went up by 10 XRP.
- Change the amount and re-run. Try sending more than you have.
- Try sending to a garbage address. Read the resulting `tec` code and
  match it against chapter 3.
- Move on to the sample repos linked from the site's [Samples page](../sample_code/)
  for order book, escrow, and NFT flows.
