import {
  Client,
  Wallet,
  NFTokenMint,
  Payment,
  convertStringToHex,
  convertHexToString,
} from "xrpl";

export const XRPL_MAINNET = "wss://xrplcluster.com";

export interface BatchData {
  drugName: string;
  batchNumber: string;
  quantity: string;
  manufacturingDate: string;
  mintedAt: string;
}

export interface MintResult {
  tokenId: string;
  txHash: string;
  manufacturerAddress: string;
  batchData: BatchData;
}

export interface CustodyEvent {
  step: "manufactured" | "distributor_received" | "pharmacy_received";
  actor: string;
  txHash: string;
  timestamp: string;
}

export interface CustodyChain {
  batchData: BatchData | null;
  events: CustodyEvent[];
  addresses: {
    manufacturer: string;
    distributor: string;
    pharmacy: string;
  };
}

function encodeBatchUri(data: BatchData): string {
  return convertStringToHex(JSON.stringify(data));
}

export async function mintBatchNFT(batchData: BatchData): Promise<MintResult> {
  const seed = process.env.XRPL_MANUFACTURER_SEED;
  if (!seed) throw new Error("XRPL_MANUFACTURER_SEED env var not set");

  const client = new Client(XRPL_MAINNET);
  await client.connect();

  try {
    const wallet = Wallet.fromSeed(seed);
    const uri = encodeBatchUri(batchData);

    if (uri.length > 1024) {
      throw new Error("Batch data too large for NFT URI field (max 512 bytes)");
    }

    const mintTx: NFTokenMint = {
      TransactionType: "NFTokenMint",
      Account: wallet.address,
      URI: uri,
      Flags: 1, // tfBurnable — allows recall if batch is compromised
      TransferFee: 0,
      NFTokenTaxon: 0,
    };

    const response = await client.submitAndWait(mintTx, { wallet });
    const meta = response.result.meta as unknown as Record<string, unknown>;

    if (typeof meta !== "object" || meta.TransactionResult !== "tesSUCCESS") {
      throw new Error(`Mint failed: ${meta?.TransactionResult ?? "unknown"}`);
    }

    // Method 1: modern XRPL nodes expose the new token ID directly in metadata
    let tokenId = typeof meta.nftoken_id === "string" ? meta.nftoken_id : "";

    // Method 2: scan AffectedNodes — use set-difference to find the inserted NFT
    if (!tokenId) {
      const nodes = meta.AffectedNodes as Array<Record<string, unknown>>;
      for (const node of nodes) {
        const created = node.CreatedNode as Record<string, unknown> | undefined;
        if (created?.LedgerEntryType === "NFTokenPage") {
          const nfts = (created.NewFields as Record<string, unknown>)
            ?.NFTokens as Array<{ NFToken: { NFTokenID: string } }> | undefined;
          if (nfts?.length) tokenId = nfts[nfts.length - 1].NFToken.NFTokenID;
          break;
        }
        const modified = node.ModifiedNode as Record<string, unknown> | undefined;
        if (modified?.LedgerEntryType === "NFTokenPage") {
          const finalNfts =
            ((modified.FinalFields as Record<string, unknown>)?.NFTokens as
              Array<{ NFToken: { NFTokenID: string } }>) ?? [];
          const prevNfts =
            ((modified.PreviousFields as Record<string, unknown>)?.NFTokens as
              Array<{ NFToken: { NFTokenID: string } }>) ?? [];
          // NFTs are stored sorted; the new one could be anywhere — use set difference
          const prevIds = new Set(prevNfts.map((n) => n.NFToken.NFTokenID));
          const newNft = finalNfts.find((n) => !prevIds.has(n.NFToken.NFTokenID));
          if (newNft) tokenId = newNft.NFToken.NFTokenID;
          break;
        }
      }
    }

    // Method 3: fallback — fetch the account's NFTs and match by URI
    if (!tokenId) {
      const nftsResp = await client.request({
        command: "account_nfts",
        account: wallet.address,
      });
      const nfts = nftsResp.result.account_nfts as Array<{ NFTokenID: string; URI?: string }>;
      const match = nfts.find((n) => n.URI?.toUpperCase() === uri.toUpperCase());
      if (match) tokenId = match.NFTokenID;
    }

    return {
      tokenId,
      txHash: response.result.hash,
      manufacturerAddress: wallet.address,
      batchData,
    };
  } finally {
    await client.disconnect();
  }
}

// Records an on-chain custody handoff as a Payment+Memo from the role's wallet.
// Distributor sends to manufacturer; pharmacy sends to distributor.
export async function confirmCustody(
  role: "distributor" | "pharmacy",
  tokenId: string,
): Promise<{ txHash: string; actor: string; timestamp: string }> {
  const seedKey = role === "distributor" ? "XRPL_DISTRIBUTOR_SEED" : "XRPL_PHARMACY_SEED";
  const seed = process.env[seedKey];
  if (!seed) throw new Error(`${seedKey} env var not set`);

  let toAddress: string;
  if (role === "distributor") {
    const mfrSeed = process.env.XRPL_MANUFACTURER_SEED;
    if (!mfrSeed) throw new Error("XRPL_MANUFACTURER_SEED env var not set");
    toAddress = Wallet.fromSeed(mfrSeed).address;
  } else {
    toAddress = process.env.XRPL_DISTRIBUTOR_ACCOUNT ?? "";
    if (!toAddress) throw new Error("XRPL_DISTRIBUTOR_ACCOUNT env var not set");
  }

  const client = new Client(XRPL_MAINNET);
  await client.connect();

  try {
    const wallet = Wallet.fromSeed(seed);
    const timestamp = new Date().toISOString();

    const memoData = convertStringToHex(
      JSON.stringify({
        step: role === "distributor" ? "distributor_received" : "pharmacy_received",
        batchId: tokenId,
        timestamp,
      }),
    );

    const tx: Payment = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: toAddress,
      Amount: "1",
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex("medverify/custody"),
            MemoData: memoData,
          },
        },
      ],
    };

    const response = await client.submitAndWait(tx, { wallet });
    const meta = response.result.meta as unknown as Record<string, unknown>;

    if (typeof meta !== "object" || meta.TransactionResult !== "tesSUCCESS") {
      throw new Error(`Custody confirmation failed: ${meta?.TransactionResult ?? "unknown"}`);
    }

    return { txHash: response.result.hash, actor: wallet.address, timestamp };
  } finally {
    await client.disconnect();
  }
}

export async function fetchCustodyChain(tokenId: string): Promise<CustodyChain> {
  const mfrSeed = process.env.XRPL_MANUFACTURER_SEED;
  if (!mfrSeed) throw new Error("XRPL_MANUFACTURER_SEED env var not set");

  const manufacturerAddress = Wallet.fromSeed(mfrSeed).address;
  const distributorAddress = process.env.XRPL_DISTRIBUTOR_ACCOUNT ?? "";
  const pharmacyAddress = process.env.XRPL_PHARMACY_ACCOUNT ?? "";

  const client = new Client(XRPL_MAINNET);
  await client.connect();

  try {
    // Fetch batch data from the manufacturer's NFT
    let batchData: BatchData | null = null;
    const nftsResp = await client.request({
      command: "account_nfts",
      account: manufacturerAddress,
    });

    const nfts = nftsResp.result.account_nfts as Array<{ NFTokenID: string; URI?: string }>;
    const nft = nfts.find((n) => n.NFTokenID === tokenId);

    if (nft?.URI) {
      try {
        batchData = JSON.parse(convertHexToString(nft.URI)) as BatchData;
      } catch {}
    }

    const events: CustodyEvent[] = [];

    if (batchData) {
      events.push({
        step: "manufactured",
        actor: manufacturerAddress,
        txHash: "",
        timestamp: batchData.mintedAt,
      });
    }

    // Scan distributor and pharmacy accounts for custody memos
    if (distributorAddress) {
      const event = await scanForCustodyMemo(client, distributorAddress, tokenId, "distributor_received");
      if (event) events.push(event);
    }

    if (pharmacyAddress) {
      const event = await scanForCustodyMemo(client, pharmacyAddress, tokenId, "pharmacy_received");
      if (event) events.push(event);
    }

    return {
      batchData,
      events,
      addresses: { manufacturer: manufacturerAddress, distributor: distributorAddress, pharmacy: pharmacyAddress },
    };
  } finally {
    await client.disconnect();
  }
}

// ── Dashboard helpers ────────────────────────────────────────────────────────

export interface BatchSummary {
  tokenId: string;
  batchData: BatchData;
  status: "complete" | "in_transit" | "minted";
  completedSteps: number;
  events: CustodyEvent[];
}

export interface LedgerActivity {
  label: string;
  txHash: string;
  timestamp: string;
}

export async function fetchAllBatches(): Promise<BatchSummary[]> {
  const mfrSeed = process.env.XRPL_MANUFACTURER_SEED;
  if (!mfrSeed) return [];

  const manufacturerAddress = Wallet.fromSeed(mfrSeed).address;
  const distributorAddress = process.env.XRPL_DISTRIBUTOR_ACCOUNT ?? "";
  const pharmacyAddress = process.env.XRPL_PHARMACY_ACCOUNT ?? "";

  const client = new Client(XRPL_MAINNET);
  await client.connect();

  try {
    const nftsResp = await client.request({
      command: "account_nfts",
      account: manufacturerAddress,
      limit: 400,
    });

    const nfts = nftsResp.result.account_nfts as Array<{ NFTokenID: string; URI?: string }>;
    if (nfts.length === 0) return [];

    const [distMap, pharmMap] = await Promise.all([
      distributorAddress
        ? buildCustodyMap(client, distributorAddress)
        : Promise.resolve(new Map<string, CustodyEvent>()),
      pharmacyAddress
        ? buildCustodyMap(client, pharmacyAddress)
        : Promise.resolve(new Map<string, CustodyEvent>()),
    ]);

    const summaries: BatchSummary[] = [];

    for (const nft of nfts) {
      if (!nft.URI) continue;
      let batchData: BatchData | null = null;
      try {
        batchData = JSON.parse(convertHexToString(nft.URI)) as BatchData;
      } catch {
        continue;
      }

      const events: CustodyEvent[] = [
        { step: "manufactured", actor: manufacturerAddress, txHash: "", timestamp: batchData.mintedAt },
      ];
      const distEvent = distMap.get(nft.NFTokenID);
      if (distEvent) events.push(distEvent);
      const pharmEvent = pharmMap.get(nft.NFTokenID);
      if (pharmEvent) events.push(pharmEvent);

      const completedSteps = events.length;
      const status = completedSteps === 3 ? "complete" : completedSteps === 2 ? "in_transit" : "minted";

      summaries.push({ tokenId: nft.NFTokenID, batchData, status, completedSteps, events });
    }

    summaries.sort(
      (a, b) => new Date(b.batchData.mintedAt).getTime() - new Date(a.batchData.mintedAt).getTime(),
    );
    return summaries;
  } finally {
    await client.disconnect();
  }
}

async function buildCustodyMap(client: Client, account: string): Promise<Map<string, CustodyEvent>> {
  const map = new Map<string, CustodyEvent>();
  try {
    const resp = await client.request({ command: "account_tx", account, limit: 400 });
    type TxEntry = { hash?: string; tx_json?: Record<string, unknown>; tx?: Record<string, unknown> };
    for (const entry of resp.result.transactions as TxEntry[]) {
      const tx = (entry.tx_json ?? entry.tx) as Record<string, unknown> | undefined;
      if (!tx || tx.TransactionType !== "Payment") continue;
      const memos = tx.Memos as Array<{ Memo: { MemoType: string; MemoData: string } }> | undefined;
      if (!memos) continue;
      for (const { Memo } of memos) {
        try {
          if (convertHexToString(Memo.MemoType) !== "medverify/custody") continue;
          const data = JSON.parse(convertHexToString(Memo.MemoData)) as {
            batchId: string; step: string; timestamp: string;
          };
          if (data.batchId && !map.has(data.batchId) &&
              (data.step === "distributor_received" || data.step === "pharmacy_received")) {
            map.set(data.batchId, {
              step: data.step as CustodyEvent["step"],
              actor: account,
              txHash: typeof entry.hash === "string" ? entry.hash : "",
              timestamp: data.timestamp,
            });
          }
        } catch {}
      }
    }
  } catch {}
  return map;
}

export async function fetchRecentLedgerActivity(): Promise<LedgerActivity[]> {
  const mfrSeed = process.env.XRPL_MANUFACTURER_SEED;
  if (!mfrSeed) return [];

  const manufacturerAddress = Wallet.fromSeed(mfrSeed).address;
  const distributorAddress = process.env.XRPL_DISTRIBUTOR_ACCOUNT ?? "";
  const pharmacyAddress = process.env.XRPL_PHARMACY_ACCOUNT ?? "";

  const client = new Client(XRPL_MAINNET);
  await client.connect();

  try {
    const activities: LedgerActivity[] = [];
    type TxEntry = { hash?: string; tx_json?: Record<string, unknown>; tx?: Record<string, unknown> };

    // Manufacturer: NFTokenMint events
    try {
      const mfrResp = await client.request({ command: "account_tx", account: manufacturerAddress, limit: 20 });
      for (const entry of mfrResp.result.transactions as TxEntry[]) {
        const tx = (entry.tx_json ?? entry.tx) as Record<string, unknown> | undefined;
        if (!tx || tx.TransactionType !== "NFTokenMint") continue;
        let label = "Batch minted on XRPL";
        if (typeof tx.URI === "string") {
          try {
            const data = JSON.parse(convertHexToString(tx.URI)) as BatchData;
            if (data.drugName) label = `${data.drugName} batch minted`;
          } catch {}
        }
        const timestamp =
          typeof tx.date === "number"
            ? new Date((tx.date + 946684800) * 1000).toISOString()
            : new Date().toISOString();
        activities.push({ label, txHash: typeof entry.hash === "string" ? entry.hash : "", timestamp });
      }
    } catch {}

    // Distributor + pharmacy: custody memo events
    for (const [address, roleName] of [
      [distributorAddress, "Distributor"],
      [pharmacyAddress, "Pharmacy"],
    ] as [string, string][]) {
      if (!address) continue;
      try {
        const resp = await client.request({ command: "account_tx", account: address, limit: 20 });
        for (const entry of resp.result.transactions as TxEntry[]) {
          const tx = (entry.tx_json ?? entry.tx) as Record<string, unknown> | undefined;
          if (!tx || tx.TransactionType !== "Payment") continue;
          const memos = tx.Memos as Array<{ Memo: { MemoType: string; MemoData: string } }> | undefined;
          if (!memos) continue;
          for (const { Memo } of memos) {
            try {
              if (convertHexToString(Memo.MemoType) !== "medverify/custody") continue;
              const data = JSON.parse(convertHexToString(Memo.MemoData)) as {
                batchId: string; timestamp: string;
              };
              const shortId = data.batchId ? `${data.batchId.slice(0, 8)}…` : "batch";
              activities.push({
                label: `${roleName} confirmed ${shortId}`,
                txHash: typeof entry.hash === "string" ? entry.hash : "",
                timestamp: data.timestamp || new Date().toISOString(),
              });
            } catch {}
          }
        }
      } catch {}
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return activities.slice(0, 5);
  } finally {
    await client.disconnect();
  }
}

// ── Single-batch helpers (used by verify page) ───────────────────────────────

async function scanForCustodyMemo(
  client: Client,
  account: string,
  tokenId: string,
  step: "distributor_received" | "pharmacy_received",
): Promise<CustodyEvent | null> {
  try {
    const resp = await client.request({
      command: "account_tx",
      account,
      limit: 200,
    });

    type TxEntry = { hash?: string; tx_json?: Record<string, unknown>; tx?: Record<string, unknown> };
    for (const entry of resp.result.transactions as TxEntry[]) {
      const tx = (entry.tx_json ?? entry.tx) as Record<string, unknown> | undefined;
      if (!tx || tx.TransactionType !== "Payment") continue;
      const memos = tx.Memos as Array<{ Memo: { MemoType: string; MemoData: string } }> | undefined;
      if (!memos) continue;
      for (const { Memo } of memos) {
        try {
          if (convertHexToString(Memo.MemoType) !== "medverify/custody") continue;
          const data = JSON.parse(convertHexToString(Memo.MemoData)) as {
            batchId: string;
            step: string;
            timestamp: string;
          };
          if (data.batchId === tokenId && data.step === step) {
            const txHash = entry.hash ?? "";
            return { step, actor: account, txHash, timestamp: data.timestamp };
          }
        } catch {}
      }
    }
  } catch {}
  return null;
}
