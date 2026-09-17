import { NextRequest, NextResponse } from "next/server";
import { fetchCustodyChain } from "@/lib/xrpl";

export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  try {
    const { tokenId } = await params;
    if (!tokenId) {
      return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
    }

    const chain = await fetchCustodyChain(tokenId);
    return NextResponse.json(chain, { status: 200 });
  } catch (err) {
    console.error("[custody]", err);
    const message = err instanceof Error ? err.message : "Failed to fetch custody chain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
