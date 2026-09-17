import Anthropic from "@anthropic-ai/sdk";
import type { CustodyChain } from "./xrpl";

export interface ChainAnalysis {
  summary: string;
  anomalies: string[];
  trustLevel: "verified" | "suspicious" | "incomplete";
}

export async function analyzeChain(chain: CustodyChain): Promise<ChainAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY env var not set");

  const client = new Anthropic({ apiKey });
  const chainJson = JSON.stringify(chain, null, 2);

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a pharmaceutical supply chain auditor. Analyze this medication batch custody chain and return a JSON response.

Chain data:
${chainJson}

Return ONLY valid JSON (no markdown, no code blocks) with this exact shape:
{
  "summary": "1-2 sentence plain-language summary of the batch journey for a patient",
  "anomalies": ["array of specific anomaly strings, empty if none"],
  "trustLevel": "verified | suspicious | incomplete"
}

Rules for anomalies — flag if any of these are true:
- Steps are out of chronological order (timestamp of a later step is earlier than a prior step)
- Expected steps are missing (manufactured, distributor_received, pharmacy_received)
- Same actor appears in multiple roles
- Time gap between consecutive steps is suspiciously short (< 1 minute) or unrealistically long (> 365 days)
- batchData is null (no on-chain batch record found)

trustLevel rules:
- "verified": all 3 steps present, timestamps in order, no anomalies
- "incomplete": one or more steps missing but no active anomalies
- "suspicious": any anomaly detected`,
      },
    ],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text.trim() : "";

  try {
    return JSON.parse(text) as ChainAnalysis;
  } catch {
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as ChainAnalysis;
  }
}
