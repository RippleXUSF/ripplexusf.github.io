"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useRole } from "@/components/RoleContext";
import {
  IconShieldCheck, IconAlertTriangle, IconExternalLink,
  IconCircleCheck, IconSpinner,
} from "@/components/Icons";
import QRCode from "react-qr-code";

type Role = "visitor" | "distributor" | "pharmacy";

interface CustodyEvent {
  step: "manufactured" | "distributor_received" | "pharmacy_received";
  actor: string;
  txHash: string;
  timestamp: string;
}
interface BatchData {
  drugName: string; batchNumber: string; quantity: string;
  manufacturingDate: string; mintedAt: string;
}
interface CustodyChain { batchData: BatchData | null; events: CustodyEvent[]; }
interface ChainAnalysis { summary: string; anomalies: string[]; trustLevel: string; }

const STEPS: { key: CustodyEvent["step"]; role: string }[] = [
  { key: "manufactured",         role: "MANUFACTURER" },
  { key: "distributor_received", role: "DISTRIBUTOR"  },
  { key: "pharmacy_received",    role: "PHARMACY"     },
];

export default function VerifyPage() {
  const params  = useParams();
  const tokenId = decodeURIComponent(params.tokenId as string);
  const router  = useRouter();

  const { role: globalRole } = useRole();
  // manufacturer has no confirm action on the verify page — default to visitor
  const initialRole: Role = globalRole === "manufacturer" ? "visitor" : globalRole;

  const [role,          setRole]          = useState<Role>(initialRole);
  const [chain,         setChain]         = useState<CustodyChain | null>(null);
  const [analysis,      setAnalysis]      = useState<ChainAnalysis | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [confirming,    setConfirming]    = useState(false);
  const [confirmError,  setConfirmError]  = useState<string | null>(null);
  const [showToast,     setShowToast]     = useState(false);
  const [toastMsg,      setToastMsg]      = useState("");
  const [pharmJustDone, setPharmJustDone] = useState(false);
  const [verifyUrl,     setVerifyUrl]     = useState("");
  const [searchQuery,   setSearchQuery]   = useState(tokenId);

  const fetchChain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/custody/${encodeURIComponent(tokenId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load chain");
      setChain(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load custody chain");
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  // Keep local role in sync if the nav role switcher changes
  useEffect(() => {
    setRole(globalRole === "manufacturer" ? "visitor" : globalRole);
  }, [globalRole]);

  useEffect(() => {
    fetchChain();
    if (typeof window !== "undefined") {
      setVerifyUrl(`${window.location.origin}/verify/${tokenId}`);
    }
  }, [fetchChain, tokenId]);

  // AI analysis runs in background after chain loads
  useEffect(() => {
    if (!chain?.batchData) return;
    fetch(`/api/analyze/${encodeURIComponent(tokenId)}`)
      .then(r => r.json())
      .then(a => setAnalysis(a))
      .catch(() => {});
  }, [chain, tokenId]);

  async function handleConfirm() {
    if (role === "visitor") return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res  = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, tokenId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Confirmation failed");
      if (role === "pharmacy") setPharmJustDone(true);
      setToastMsg(role === "pharmacy" ? "Chain complete — QR ready" : "Receipt confirmed on XRPL");
      setShowToast(true);
      await fetchChain(); // refresh chain to reflect new step
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setConfirming(false);
    }
  }

  const presentSteps   = new Set(chain?.events.map(e => e.step) ?? []);
  const distDone       = presentSteps.has("distributor_received");
  const pharmConfirmed = presentSteps.has("pharmacy_received") || pharmJustDone;
  const allDone        = presentSteps.size === 3;
  const hasAnomalies   = (analysis?.anomalies.length ?? 0) > 0;

  const statusBadge = allDone
    ? { label: "complete",   bg: "#0A2820", color: "#1FA87A" }
    : hasAnomalies
    ? { label: "anomaly",    bg: "#1A0505", color: "#F08080" }
    : { label: "in transit", bg: "#1A1000", color: "#D4861C" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111312" }}>
      <Nav />
      <main style={{ padding: "2rem", maxWidth: 1280, margin: "0 auto" }}>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1.5rem" }}>
          verify batch
        </p>

        {/* Search */}
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 10 }}>Look up a batch</p>
          <form onSubmit={e => { e.preventDefault(); const q = searchQuery.trim(); if (q) router.push(`/verify/${encodeURIComponent(q)}`); }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter batch token ID…"
                style={{ flex: 1, fontSize: 13, padding: "8px 10px", border: "0.5px solid #272B29", borderRadius: 8, backgroundColor: "#111312", color: "#E8E6E0", outline: "none", fontFamily: "var(--font-mono)", colorScheme: "dark" }}
                onFocus={e => { e.target.style.borderColor = "#17906A"; }}
                onBlur={e =>  { e.target.style.borderColor = "#272B29"; }}
              />
              <button type="submit" style={{ backgroundColor: "#17906A", color: "#E8E6E0", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                Verify
              </button>
            </div>
          </form>
        </div>

        {/* Role selector */}
        <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#6E6C66" }}>I am a:</span>
          {(["visitor", "distributor", "pharmacy"] as Role[]).map(r => (
            <button key={r} onClick={() => { setRole(r); setConfirmError(null); }}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 12px", borderRadius: 20, border: `0.5px solid ${role === r ? "#17906A" : "#272B29"}`, backgroundColor: role === r ? "#17906A" : "transparent", color: role === r ? "#E8E6E0" : "#6E6C66", cursor: "pointer", transition: "all 0.15s" }}>
              {r}
            </button>
          ))}
          {role !== "visitor" && (
            <span style={{ fontSize: 11, color: "#6E6C66" }}>
              {role === "distributor"
                ? "— confirm you received this batch from the manufacturer"
                : "— confirm receipt and generate a patient QR code"}
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ backgroundColor: "#1C1F1D", border: "0.5px solid #272B29", borderRadius: 12, padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <IconSpinner size={16} color="#6E6C66" />
            <span style={{ fontSize: 13, color: "#6E6C66" }}>Fetching chain from XRPL…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ backgroundColor: "#1A0505", border: "0.5px solid #5A1A1A", borderRadius: 12, padding: "1.25rem" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#E05555", marginBottom: 4 }}>Failed to load chain</p>
            <p style={{ fontSize: 12, color: "#E05555" }}>{error}</p>
          </div>
        )}

        {/* Not found */}
        {!loading && !error && !chain?.batchData && (
          <div style={{ backgroundColor: "#1A1000", border: "0.5px solid #4A2E06", borderRadius: 12, padding: "1.25rem" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#D4861C", marginBottom: 4 }}>Batch not found</p>
            <p style={{ fontSize: 12, color: "#C07830" }}>
              No on-chain record for{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>{tokenId}</span>. This medication may be counterfeit.
            </p>
          </div>
        )}

        {/* Result card */}
        {!loading && !error && chain?.batchData && (
          <div style={{ border: "0.5px solid #174A3A", borderRadius: 12, overflow: "hidden" }}>

            {/* Header strip */}
            <div style={{ backgroundColor: "#0A2820", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconShieldCheck size={16} color="#1FA87A" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#A8E8D0" }}>
                  {tokenId.length > 16 ? `${tokenId.slice(0, 12)}…` : tokenId} · {chain.batchData.drugName}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 20, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
            </div>

            <div style={{ backgroundColor: "#1C1F1D", padding: 14 }}>

              {/* Batch info + Chain of custody */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <SectionLabel>batch info</SectionLabel>
                  <InfoRows rows={[
                    { key: "Drug",         value: chain.batchData.drugName         },
                    { key: "Batch #",      value: chain.batchData.batchNumber      },
                    { key: "Quantity",     value: chain.batchData.quantity          },
                    { key: "Manufactured", value: chain.batchData.manufacturingDate },
                  ]} />
                </div>
                <div>
                  <SectionLabel>chain of custody</SectionLabel>
                  <CustodyTimeline events={chain.events} />
                </div>
              </div>

              {/* Anomaly alert */}
              {hasAnomalies && (
                <div style={{ display: "flex", gap: 10, backgroundColor: "#1A1000", border: "0.5px solid #4A2E06", borderRadius: 8, padding: "10px 14px", marginTop: 14 }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}><IconAlertTriangle size={14} color="#D4861C" /></span>
                  <p style={{ fontSize: 12, color: "#C07830", lineHeight: 1.5, margin: 0 }}>{analysis!.anomalies.join(" · ")}</p>
                </div>
              )}

              {/* AI summary */}
              {analysis && (
                <div style={{ backgroundColor: "#111312", borderRadius: 8, padding: "12px 14px", marginTop: 14 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6E6C66", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                    ai summary
                  </p>
                  <p style={{ fontSize: 13, color: "#6E6C66", lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
                </div>
              )}

              {/* XRPL tx row */}
              <div style={{ borderTop: "0.5px solid #272B29", marginTop: 10, paddingTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", flexShrink: 0 }}>XRPL tx</span>
                <a href={`https://livenet.xrpl.org/nft/${tokenId}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1FA87A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>
                  {tokenId}
                </a>
                <a href={`https://livenet.xrpl.org/nft/${tokenId}`} target="_blank" rel="noopener noreferrer">
                  <IconExternalLink size={13} color="#6E6C66" />
                </a>
              </div>

              {/* ── Role-based action panel ── */}
              {role !== "visitor" && (
                <div style={{ borderTop: "0.5px solid #272B29", marginTop: 14, paddingTop: 14 }}>
                  <SectionLabel>{role === "distributor" ? "distributor action" : "pharmacy action"}</SectionLabel>

                  {role === "distributor" && (
                    distDone ? (
                      <AlreadyConfirmed
                        event={chain.events.find(e => e.step === "distributor_received") ?? null}
                        label="Distributor receipt already on-chain"
                      />
                    ) : (
                      <ConfirmCard
                        title="Confirm receipt"
                        description="Record on-chain that your facility received this batch from the manufacturer."
                        buttonLabel="Confirm receipt"
                        confirming={confirming}
                        error={confirmError}
                        onConfirm={handleConfirm}
                      />
                    )
                  )}

                  {role === "pharmacy" && (
                    pharmConfirmed ? (
                      <div>
                        <AlreadyConfirmed
                          event={chain.events.find(e => e.step === "pharmacy_received") ?? null}
                          label="Pharmacy receipt already on-chain"
                        />
                        {verifyUrl && (
                          <div style={{ marginTop: 14 }}>
                            <p style={{ fontSize: 12, color: "#6E6C66", marginBottom: 10 }}>Patient QR code — print on medication packaging.</p>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                              <div style={{ backgroundColor: "#FFFFFF", padding: 16, borderRadius: 8 }}>
                                <QRCode value={verifyUrl} size={160} />
                              </div>
                            </div>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6E6C66", textAlign: "center", wordBreak: "break-all" }}>{verifyUrl}</p>
                          </div>
                        )}
                      </div>
                    ) : !distDone ? (
                      <div style={{ backgroundColor: "#1A1000", border: "0.5px solid #4A2E06", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <IconAlertTriangle size={14} color="#D4861C" />
                        <p style={{ fontSize: 12, color: "#C07830", margin: 0 }}>
                          Awaiting distributor confirmation before pharmacy can confirm.
                        </p>
                      </div>
                    ) : (
                      <ConfirmCard
                        title="Confirm receipt & generate QR"
                        description="Record on-chain that your pharmacy received this batch. A patient QR code will be generated."
                        buttonLabel="Confirm & generate QR"
                        confirming={confirming}
                        error={confirmError}
                        onConfirm={handleConfirm}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {showToast && <Toast message={toastMsg} onDone={() => setShowToast(false)} />}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
      {children}
    </p>
  );
}

function InfoRows({ rows }: { rows: { key: string; value: string }[] }) {
  return (
    <div>
      {rows.map((row, i) => (
        <div key={row.key}>
          {i > 0 && <div style={{ height: "0.5px", backgroundColor: "#272B29", margin: "8px 0" }} />}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6E6C66" }}>{row.key}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#E8E6E0", textAlign: "right" }}>{row.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  const eventMap = new Map(events.map(e => [e.step, e]));
  return (
    <div style={{ position: "relative", paddingLeft: 20 }}>
      <div style={{ position: "absolute", left: 4, top: 8, bottom: 8, width: 1, backgroundColor: "#272B29" }} />
      {STEPS.map((step, i) => {
        const event = eventMap.get(step.key);
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < STEPS.length - 1 ? 16 : 0, position: "relative" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: event ? "#17906A" : "#1C1F1D", border: event ? "none" : "0.5px solid #272B29", flexShrink: 0, marginLeft: -16, marginTop: 3, zIndex: 1, position: "relative" }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", textTransform: "uppercase", marginBottom: 1 }}>{step.role}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 1 }}>
                {event ? `${event.actor.slice(0, 8)}…${event.actor.slice(-6)}` : "Pending"}
              </p>
              {event && <p style={{ fontSize: 11, color: "#6E6C66" }}>{new Date(event.timestamp).toLocaleDateString()}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlreadyConfirmed({ event, label }: { event: CustodyEvent | null; label: string }) {
  return (
    <div style={{ backgroundColor: "#0A2820", border: "0.5px solid #174A3A", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: event?.txHash ? 6 : 0 }}>
        <IconCircleCheck size={14} color="#1FA87A" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#A8E8D0" }}>{label}</span>
      </div>
      {event?.txHash && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1FA87A", margin: 0, wordBreak: "break-all" }}>
          tx: {event.txHash.slice(0, 20)}…
        </p>
      )}
    </div>
  );
}

function ConfirmCard({ title, description, buttonLabel, confirming, error, onConfirm }: {
  title: string; description: string; buttonLabel: string;
  confirming: boolean; error: string | null; onConfirm: () => void;
}) {
  return (
    <div style={{ backgroundColor: "#111312", border: "0.5px solid #272B29", borderRadius: 8, padding: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0", marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 12, color: "#6E6C66", lineHeight: 1.5, marginBottom: 12 }}>{description}</p>
      {error && (
        <div style={{ backgroundColor: "#1A0505", border: "0.5px solid #5A1A1A", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#E05555", marginBottom: 10 }}>
          {error}
        </div>
      )}
      <button onClick={onConfirm} disabled={confirming}
        style={{ width: "100%", backgroundColor: confirming ? "#1FA87A" : "#17906A", color: "#E8E6E0", fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", cursor: confirming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background-color 0.15s" }}>
        {confirming ? (
          <><IconSpinner size={14} color="#E8E6E0" />Recording on XRPL…</>
        ) : (
          <><IconShieldCheck size={14} color="#E8E6E0" />{buttonLabel}</>
        )}
      </button>
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="toast-animate" style={{ position: "fixed", bottom: "2rem", left: "50%", backgroundColor: "#12785A", color: "#E8E6E0", fontSize: 13, padding: "10px 18px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8, zIndex: 100, whiteSpace: "nowrap" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M9 12l2 2l4 -4" />
      </svg>
      {message}
    </div>
  );
}
