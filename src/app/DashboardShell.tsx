"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useRole, AppRole } from "@/components/RoleContext";
import type { BatchSummary, LedgerActivity } from "@/lib/xrpl";
import {
  IconPill, IconAlertTriangle, IconCircleCheck,
  IconPlus, IconShieldCheck, IconSpinner, IconExternalLink,
} from "@/components/Icons";
import QRCode from "react-qr-code";

// ── Role tab bar ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<AppRole, { label: string; description: string }> = {
  manufacturer: { label: "Manufacturer", description: "Mint batch records & monitor the full supply chain" },
  distributor:  { label: "Distributor",  description: "Confirm receipt of batches from manufacturers"      },
  pharmacy:     { label: "Pharmacy",     description: "Confirm receipt & generate patient QR codes"        },
};

function RoleTabs({ role, setRole }: { role: AppRole; setRole: (r: AppRole) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
      {(["manufacturer", "distributor", "pharmacy"] as AppRole[]).map(r => {
        const active = role === r;
        return (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              padding: "14px 16px", textAlign: "left", cursor: "pointer",
              border: `0.5px solid ${active ? "#17906A" : "#272B29"}`,
              borderRadius: 12,
              backgroundColor: active ? "#0A2820" : "#1C1F1D",
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: active ? "#17906A" : "#272B29", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: active ? "#1FA87A" : "#6E6C66", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {ROLE_CONFIG[r].label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: active ? "#A8E8D0" : "#6E6C66", margin: 0, lineHeight: 1.4 }}>
              {ROLE_CONFIG[r].description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function detectAnomaly(batch: BatchSummary): string | null {
  for (let i = 1; i < batch.events.length; i++) {
    if (new Date(batch.events[i].timestamp) < new Date(batch.events[i - 1].timestamp))
      return `Timestamp inversion between ${batch.events[i - 1].step} and ${batch.events[i].step}`;
  }
  return null;
}

function ProgressDots({ completed }: { completed: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: i < completed ? "#17906A" : "#272B29" }} />
          {i < 2 && <div style={{ width: 20, height: 1, backgroundColor: i < completed - 1 ? "#17906A" : "#272B29" }} />}
        </div>
      ))}
    </div>
  );
}

const BADGE: Record<string, { bg: string; color: string }> = {
  complete:   { bg: "#0A2820", color: "#1FA87A" },
  in_transit: { bg: "#1A1000", color: "#D4861C" },
  minted:     { bg: "#1A1A2A", color: "#8888CC" },
  anomaly:    { bg: "#1A0505", color: "#F08080" },
};

// ── Manufacturer view (existing dashboard) ────────────────────────────────────

function ManufacturerView({ batches, activity }: { batches: BatchSummary[]; activity: LedgerActivity[] }) {
  const anomalous     = batches.filter(b => detectAnomaly(b) !== null);
  const recentBatches = batches.slice(0, 5);
  const stats = [
    { value: String(batches.length),        label: "batches tracked", amber: false },
    { value: String(batches.filter(b => b.status === "in_transit").length), label: "in transit", amber: false },
    { value: String(anomalous.length),       label: "anomalies",       amber: anomalous.length > 0 },
  ];

  return (
    <>
      {/* Hero */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "2rem", marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>supply chain overview</p>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 28, fontWeight: 300, color: "#E8E6E0", lineHeight: 1.3, marginBottom: 12 }}>
            Track every batch,<br /><em style={{ color: "#1FA87A" }}>end to end.</em>
          </h1>
          <p style={{ fontSize: 14, color: "#6E6C66", lineHeight: 1.6, maxWidth: 480 }}>
            MedVerify anchors every custody handoff on the XRP Ledger. Mint a batch below, then share the token ID with your distributor.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 140 }}>
          {stats.map(s => (
            <div key={s.label} style={{ backgroundColor: "#111312", borderRadius: 8, padding: "12px 16px", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: s.amber ? "#D4861C" : "#E8E6E0" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6E6C66", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Recent batches */}
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0" }}>Recent batches</span>
            <Link href="/manufacture" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px", border: "0.5px solid #272B29", borderRadius: 8, color: "#6E6C66", textDecoration: "none" }}>
              <IconPlus size={12} color="#6E6C66" /> New
            </Link>
          </div>
          {recentBatches.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6E6C66", textAlign: "center", padding: "1rem 0" }}>No batches yet — mint one to get started.</p>
          ) : recentBatches.map((batch, i) => {
            const anomaly   = detectAnomaly(batch);
            const badgeKey  = anomaly ? "anomaly" : batch.status;
            const badge     = BADGE[badgeKey] ?? BADGE.minted;
            const isLast    = i === recentBatches.length - 1;
            return (
              <Link key={batch.tokenId} href={`/verify/${batch.tokenId}`} style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 0", borderBottom: isLast ? "none" : "0.5px solid #272B29" }}>
                  <div style={{ width: 32, height: 32, backgroundColor: "#0A2820", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <IconPill size={15} color="#1FA87A" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 1 }}>{batch.batchData.drugName}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", marginBottom: 6 }}>{batch.batchData.batchNumber} · {batch.batchData.quantity}</div>
                    <ProgressDots completed={batch.completedSteps} />
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: badge.bg, color: badge.color, flexShrink: 0 }}>
                    {anomaly ? "anomaly" : batch.status.replace("_", " ")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Anomaly log */}
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0" }}>AI anomaly log</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: "#1A1000", color: "#D4861C" }}>{anomalous.length} flagged</span>
          </div>
          {anomalous.length === 0 ? (
            <div style={{ backgroundColor: "#111312", borderRadius: 8, padding: "12px 14px", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <IconCircleCheck size={13} color="#1FA87A" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1FA87A" }}>No anomalies detected</span>
              </div>
              <p style={{ fontSize: 12, color: "#6E6C66", lineHeight: 1.5, margin: 0 }}>
                All {batches.length} batch{batches.length !== 1 ? "es" : ""} have consistent timestamps.
              </p>
            </div>
          ) : anomalous.slice(0, 2).map(batch => (
            <Link key={batch.tokenId} href={`/verify/${batch.tokenId}`} style={{ textDecoration: "none", display: "block", marginBottom: "0.75rem" }}>
              <div style={{ border: "0.5px solid #4A2E06", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconAlertTriangle size={14} color="#D4861C" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#E09840" }}>Timestamp anomaly</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 7px", borderRadius: 20, backgroundColor: "#1A1000", color: "#D4861C" }}>{batch.batchData.batchNumber}</span>
                </div>
                <p style={{ fontSize: 12, color: "#C07830", lineHeight: 1.5, margin: 0 }}>{detectAnomaly(batch)}</p>
              </div>
            </Link>
          ))}
          <div style={{ height: "0.5px", backgroundColor: "#272B29", margin: "1rem 0" }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6E6C66", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>chain analysis</p>
          <p style={{ fontSize: 13, color: "#6E6C66", lineHeight: 1.6, backgroundColor: "#111312", borderRadius: 8, padding: "12px 14px", margin: 0 }}>
            {anomalous.length > 0
              ? `${anomalous.length} batch${anomalous.length !== 1 ? "es" : ""} flagged for timestamp irregularities. Open a batch on the verify page for full AI analysis.`
              : `Chain integrity looks good across all ${batches.length} tracked batch${batches.length !== 1 ? "es" : ""}. Open any batch on the verify page for a detailed AI summary.`}
          </p>
        </div>
      </div>

      {/* Ledger activity */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0" }}>XRPL ledger activity</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66" }}>live · mainnet</span>
        </div>
        {activity.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6E6C66" }}>No transactions yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activity.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconCircleCheck size={12} color="#1FA87A" />
                  <span style={{ fontSize: 13, color: "#E8E6E0" }}>{item.label}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", flexShrink: 0 }}>{timeAgo(item.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Distributor view ──────────────────────────────────────────────────────────

function DistributorView({ batches, onRefresh }: { batches: BatchSummary[]; onRefresh: () => void }) {
  const pending   = batches.filter(b => b.status === "minted");
  const confirmed = batches.filter(b => b.status !== "minted");

  const [confirming,  setConfirming]  = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  async function handleConfirm(tokenId: string) {
    setConfirming(tokenId);
    setErrors(prev => { const e = { ...prev }; delete e[tokenId]; return e; });
    try {
      const res  = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "distributor", tokenId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Confirmation failed");
      setConfirmedIds(prev => new Set(prev).add(tokenId));
      onRefresh();
    } catch (err) {
      setErrors(prev => ({ ...prev, [tokenId]: err instanceof Error ? err.message : "Failed" }));
    } finally {
      setConfirming(null);
    }
  }

  return (
    <>
      {/* Hero */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "2rem", marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>distributor portal</p>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 28, fontWeight: 300, color: "#E8E6E0", lineHeight: 1.3, marginBottom: 12 }}>
            Confirm receipt,<br /><em style={{ color: "#1FA87A" }}>advance the chain.</em>
          </h1>
          <p style={{ fontSize: 14, color: "#6E6C66", lineHeight: 1.6, maxWidth: 480 }}>
            Each confirmation signs an on-chain transaction from your wallet, recording that your facility received the batch from the manufacturer.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 140 }}>
          {[
            { value: String(pending.length),   label: "awaiting you",  amber: pending.length > 0 },
            { value: String(confirmed.length),  label: "confirmed",     amber: false },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: "#111312", borderRadius: 8, padding: "12px 16px", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: s.amber ? "#D4861C" : "#E8E6E0" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6E6C66", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending batches */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0" }}>Awaiting your confirmation</span>
          {pending.length > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: "#1A1000", color: "#D4861C" }}>
              {pending.length} pending
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "1rem 0" }}>
            <IconCircleCheck size={14} color="#1FA87A" />
            <p style={{ fontSize: 13, color: "#6E6C66", margin: 0 }}>All caught up — no batches waiting for your confirmation.</p>
          </div>
        ) : pending.map((batch, i) => {
          const done    = confirmedIds.has(batch.tokenId);
          const busy    = confirming === batch.tokenId;
          const isLast  = i === pending.length - 1;
          return (
            <div key={batch.tokenId} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "12px 0", borderBottom: isLast ? "none" : "0.5px solid #272B29" }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#0A2820", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconPill size={15} color="#1FA87A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 2 }}>{batch.batchData.drugName}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66" }}>{batch.batchData.batchNumber} · {batch.batchData.quantity}</div>
                {errors[batch.tokenId] && (
                  <div style={{ fontSize: 11, color: "#E05555", marginTop: 4 }}>{errors[batch.tokenId]}</div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {done ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#0A2820", border: "0.5px solid #174A3A", borderRadius: 8, padding: "6px 12px" }}>
                    <IconCircleCheck size={13} color="#1FA87A" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1FA87A" }}>Confirmed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirm(batch.tokenId)}
                    disabled={!!busy}
                    style={{ backgroundColor: busy ? "#1FA87A" : "#17906A", color: "#E8E6E0", fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background-color 0.15s" }}
                  >
                    {busy ? <><IconSpinner size={12} color="#E8E6E0" />Confirming…</> : <><IconShieldCheck size={12} color="#E8E6E0" />Confirm receipt</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Already confirmed */}
      {confirmed.length > 0 && (
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", display: "block", marginBottom: "1rem" }}>Previously confirmed</span>
          {confirmed.slice(0, 4).map((batch, i) => (
            <Link key={batch.tokenId} href={`/verify/${batch.tokenId}`} style={{ textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(confirmed.length, 4) - 1 ? "0.5px solid #272B29" : "none" }}>
                <IconCircleCheck size={13} color="#1FA87A" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: "#E8E6E0" }}>{batch.batchData.drugName}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", marginLeft: 8 }}>{batch.batchData.batchNumber}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: batch.status === "complete" ? "#0A2820" : "#1A1000", color: batch.status === "complete" ? "#1FA87A" : "#D4861C" }}>
                  {batch.status.replace("_", " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// ── Pharmacy view ─────────────────────────────────────────────────────────────

function PharmacyView({ batches, onRefresh }: { batches: BatchSummary[]; onRefresh: () => void }) {
  const ready     = batches.filter(b => b.status === "in_transit");
  const complete  = batches.filter(b => b.status === "complete");

  const [confirming,   setConfirming]   = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [qrTokenId,    setQrTokenId]    = useState<string | null>(null);

  async function handleConfirm(tokenId: string) {
    setConfirming(tokenId);
    setErrors(prev => { const e = { ...prev }; delete e[tokenId]; return e; });
    try {
      const res  = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "pharmacy", tokenId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Confirmation failed");
      setConfirmedIds(prev => new Set(prev).add(tokenId));
      setQrTokenId(tokenId);
      onRefresh();
    } catch (err) {
      setErrors(prev => ({ ...prev, [tokenId]: err instanceof Error ? err.message : "Failed" }));
    } finally {
      setConfirming(null);
    }
  }

  const verifyBase = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      {/* Hero */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "2rem", marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>pharmacy portal</p>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 28, fontWeight: 300, color: "#E8E6E0", lineHeight: 1.3, marginBottom: 12 }}>
            Dispense with<br /><em style={{ color: "#1FA87A" }}>confidence.</em>
          </h1>
          <p style={{ fontSize: 14, color: "#6E6C66", lineHeight: 1.6, maxWidth: 480 }}>
            Confirm receipt of verified batches and generate patient QR codes. Patients scan to see the full chain of custody.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 140 }}>
          {[
            { value: String(ready.length),    label: "ready to confirm", amber: ready.length > 0 },
            { value: String(complete.length), label: "QR codes issued",  amber: false },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: "#111312", borderRadius: 8, padding: "12px 16px", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500, color: s.amber ? "#D4861C" : "#E8E6E0" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#6E6C66", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* QR modal — shown after confirming */}
      {qrTokenId && verifyBase && (
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #174A3A", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <IconCircleCheck size={16} color="#1FA87A" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#A8E8D0" }}>Chain complete — patient QR ready</span>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
            <div style={{ backgroundColor: "#FFFFFF", padding: 14, borderRadius: 8, flexShrink: 0 }}>
              <QRCode value={`${verifyBase}/verify/${qrTokenId}`} size={140} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#6E6C66", lineHeight: 1.6, marginBottom: 10 }}>
                Print on medication packaging. Patients scan to view the full verified chain of custody.
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6E6C66", wordBreak: "break-all", marginBottom: 10 }}>
                {verifyBase}/verify/{qrTokenId}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/verify/${qrTokenId}`} target="_blank" style={{ fontSize: 12, color: "#1FA87A", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                  <IconExternalLink size={12} color="#1FA87A" /> Preview page
                </Link>
                <button onClick={() => setQrTokenId(null)} style={{ fontSize: 12, color: "#6E6C66", background: "none", border: "none", cursor: "pointer" }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ready to confirm */}
      <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0" }}>Ready to confirm</span>
          {ready.length > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: "#1A1000", color: "#D4861C" }}>
              {ready.length} pending
            </span>
          )}
        </div>

        {ready.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "1rem 0" }}>
            <IconCircleCheck size={14} color="#1FA87A" />
            <p style={{ fontSize: 13, color: "#6E6C66", margin: 0 }}>No batches waiting — distributor hasn&apos;t confirmed any yet.</p>
          </div>
        ) : ready.map((batch, i) => {
          const done   = confirmedIds.has(batch.tokenId);
          const busy   = confirming === batch.tokenId;
          const isLast = i === ready.length - 1;
          return (
            <div key={batch.tokenId} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "12px 0", borderBottom: isLast ? "none" : "0.5px solid #272B29" }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#0A2820", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconPill size={15} color="#1FA87A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 2 }}>{batch.batchData.drugName}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66" }}>{batch.batchData.batchNumber} · {batch.batchData.quantity}</div>
                {errors[batch.tokenId] && (
                  <div style={{ fontSize: 11, color: "#E05555", marginTop: 4 }}>{errors[batch.tokenId]}</div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {done ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: "#0A2820", border: "0.5px solid #174A3A", borderRadius: 8, padding: "6px 12px" }}>
                    <IconCircleCheck size={13} color="#1FA87A" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1FA87A" }}>QR ready</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConfirm(batch.tokenId)}
                    disabled={!!busy}
                    style={{ backgroundColor: busy ? "#1FA87A" : "#17906A", color: "#E8E6E0", fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "none", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background-color 0.15s" }}
                  >
                    {busy ? <><IconSpinner size={12} color="#E8E6E0" />Confirming…</> : <><IconShieldCheck size={12} color="#E8E6E0" />Confirm & QR</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed */}
      {complete.length > 0 && (
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", display: "block", marginBottom: "1rem" }}>QR codes issued</span>
          {complete.slice(0, 4).map((batch, i) => (
            <Link key={batch.tokenId} href={`/verify/${batch.tokenId}`} style={{ textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(complete.length, 4) - 1 ? "0.5px solid #272B29" : "none" }}>
                <IconCircleCheck size={13} color="#1FA87A" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: "#E8E6E0" }}>{batch.batchData.drugName}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", marginLeft: 8 }}>{batch.batchData.batchNumber}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: "#0A2820", color: "#1FA87A" }}>complete</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// ── Root shell ────────────────────────────────────────────────────────────────

export default function DashboardShell({
  batches,
  activity,
}: {
  batches: BatchSummary[];
  activity: LedgerActivity[];
}) {
  const { role, setRole } = useRole();
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111312" }}>
      <Nav />
      <main style={{ padding: "2rem", maxWidth: 1280, margin: "0 auto" }}>
        <RoleTabs role={role} setRole={setRole} />
        {role === "manufacturer" && <ManufacturerView batches={batches} activity={activity} />}
        {role === "distributor"  && <DistributorView  batches={batches} onRefresh={() => router.refresh()} />}
        {role === "pharmacy"     && <PharmacyView     batches={batches} onRefresh={() => router.refresh()} />}
      </main>
    </div>
  );
}
