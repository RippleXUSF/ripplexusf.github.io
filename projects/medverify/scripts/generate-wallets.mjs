/**
 * Generates three fresh XRPL mainnet wallets (manufacturer, distributor, pharmacy).
 * Run once, copy output into .env.local, then fund each address with real XRP.
 *
 * Usage:  node scripts/generate-wallets.mjs
 *
 * Each wallet needs at minimum ~10 XRP (base reserve) + a small buffer for fees.
 * Mint transactions cost ~0.000012 XRP; Payment transactions cost ~0.000012 XRP.
 */

import { Wallet } from "xrpl";

const roles = ["MANUFACTURER", "DISTRIBUTOR", "PHARMACY"];

for (const role of roles) {
  const wallet = Wallet.generate();
  console.log(`\n# ${role}`);
  console.log(`# Address: ${wallet.address}`);
  if (role === "MANUFACTURER") {
    console.log(`XRPL_MANUFACTURER_SEED=${wallet.seed}`);
  } else {
    console.log(`XRPL_${role}_ACCOUNT=${wallet.address}`);
    console.log(`XRPL_${role}_SEED=${wallet.seed}`);
    console.log(`XRPL_${role}_PRIVATE_KEY=${wallet.privateKey}`);
    console.log(`XRPL_${role}_PUBLIC_KEY=${wallet.publicKey}`);
  }
}

console.log(`
# ─────────────────────────────────────────────────────
# Fund each address above with XRP before going live.
# Each wallet needs ~10 XRP reserve + ~1 XRP buffer.
# ─────────────────────────────────────────────────────`);
