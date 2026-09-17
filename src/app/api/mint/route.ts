import { NextRequest, NextResponse } from "next/server";
import { mintBatchNFT, BatchData } from "@/lib/xrpl";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { drugName, batchNumber, quantity, manufacturingDate } = body;

    if (!drugName || !batchNumber || !quantity || !manufacturingDate) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const batchData: BatchData = {
      drugName: String(drugName).trim(),
      batchNumber: String(batchNumber).trim(),
      quantity: String(quantity).trim(),
      manufacturingDate: String(manufacturingDate).trim(),
      mintedAt: new Date().toISOString(),
    };

    const result = await mintBatchNFT(batchData);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[mint]", err);
    const message = err instanceof Error ? err.message : "Minting failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
