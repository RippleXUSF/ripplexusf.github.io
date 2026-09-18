"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { IconSearch } from "@/components/Icons";
import { useRole } from "@/components/RoleContext";

const HINTS: Record<string, { title: string; description: string }> = {
  manufacturer: {
    title: "Look up a batch",
    description: "Enter a token ID to view the full custody chain for any batch you've minted.",
  },
  distributor: {
    title: "Enter the batch token ID",
    description: "The manufacturer shares this after minting. Paste it below to confirm receipt on-chain.",
  },
  pharmacy: {
    title: "Enter the batch token ID",
    description: "The distributor shares this after confirming receipt. Paste it below to confirm and generate a patient QR code.",
  },
};

export default function VerifySearchPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { role } = useRole();
  const hint = HINTS[role];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/verify/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111312" }}>
      <Nav />
      <main style={{ padding: "2rem", maxWidth: 1280, margin: "0 auto" }}>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          {role === "manufacturer" ? "verify batch" : role === "distributor" ? "confirm receipt" : "confirm & generate QR"}
        </p>

        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 6 }}>
            {hint.title}
          </p>
          <p style={{ fontSize: 12, color: "#6E6C66", lineHeight: 1.5, marginBottom: 12 }}>
            {hint.description}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Enter batch token ID…"
                style={{
                  flex: 1, fontSize: 13, padding: "8px 10px",
                  border: "0.5px solid #272B29", borderRadius: 8,
                  backgroundColor: "#111312", color: "#E8E6E0",
                  outline: "none", transition: "border-color 0.15s", colorScheme: "dark",
                }}
                onFocus={e => { e.target.style.borderColor = "#17906A"; }}
                onBlur={e =>  { e.target.style.borderColor = "#272B29"; }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: "#17906A", color: "#E8E6E0", fontSize: 13, fontWeight: 600,
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#12785A"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#17906A"; }}
              >
                <IconSearch size={14} color="#E8E6E0" />
                {role === "manufacturer" ? "Verify" : "Look up"}
              </button>
            </div>
          </form>
        </div>

      </main>
    </div>
  );
}
