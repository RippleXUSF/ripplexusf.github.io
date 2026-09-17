import { NextRequest, NextResponse } from "next/server";
import { confirmCustody } from "@/lib/xrpl";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, tokenId } = body;

    if (!role || !tokenId) {
      return NextResponse.json({ error: "role and tokenId are required" }, { status: 400 });
    }
    if (role !== "distributor" && role !== "pharmacy") {
      return NextResponse.json({ error: "role must be distributor or pharmacy" }, { status: 400 });
    }

    const result = await confirmCustody(role as "distributor" | "pharmacy", String(tokenId).trim());
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[confirm]", err);
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
