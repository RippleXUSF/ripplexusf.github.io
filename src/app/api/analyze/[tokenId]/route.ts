import { NextRequest, NextResponse } from "next/server";
import { fetchCustodyChain } from "@/lib/xrpl";
import { analyzeChain } from "@/lib/gemini";

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  try {
    const { tokenId } = await params;
    if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });

    const chain = await fetchCustodyChain(tokenId);
    const analysis = await analyzeChain(chain);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
