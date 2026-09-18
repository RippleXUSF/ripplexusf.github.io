import { NextResponse } from "next/server";
import { Wallet } from "xrpl";

export async function GET() {
  try {
    const seed = process.env.XRPL_MANUFACTURER_SEED;
    if (!seed) return NextResponse.json({ address: null });
    const wallet = Wallet.fromSeed(seed);
    return NextResponse.json({ address: wallet.address });
  } catch {
    return NextResponse.json({ address: null });
  }
}
