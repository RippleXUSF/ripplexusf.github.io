"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { IconShieldCheck, IconSpinner, IconCircleCheck } from "@/components/Icons";
import QRCode from "react-qr-code";

interface ConfirmResult {
  txHash: string;
  actor: string;
  timestamp: string;
}

export default function PharmacyPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [confirmedTokenId, setConfirmedTokenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState("");

  useEffect(() => {
    if (confirmedTokenId && typeof window !== "undefined") {
      setVerifyUrl(`${window.location.origin}/verify/${confirmedTokenId}`);
    }
  }, [confirmedTokenId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setConfirmedTokenId(null);
    setLoading(true);

    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "pharmacy", tokenId: tokenId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Confirmation failed");
      setResult(json);
      setConfirmedTokenId(tokenId.trim());
      setShowToast(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111312" }}>
      <Nav />
      <main style={{ padding: "2rem", maxWidth: 1280, margin: "0 auto" }}>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6E6C66",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}
        >
          pharmacy · confirm &amp; generate QR
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Form */}
          <div
            style={{
              backgroundColor: "#1C1F1D",
              border: "0.5px solid #272B29",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", marginBottom: "1rem" }}>
              Confirm batch received
            </p>
            <p style={{ fontSize: 13, color: "#6E6C66", lineHeight: 1.5, marginBottom: "1rem" }}>
              Enter the token ID from your distributor. This finalises the chain of custody
              on-chain and generates a patient QR code.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6E6C66", marginBottom: 5 }}>
                  Batch token ID
                </label>
                <input
                  type="text"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="e.g. 000800006B4F…"
                  required
                  style={{
                    width: "100%",
                    fontSize: 13,
                    padding: "8px 10px",
                    border: "0.5px solid #272B29",
                    borderRadius: 8,
                    backgroundColor: "#111312",
                    color: "#E8E6E0",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    transition: "border-color 0.15s",
                    colorScheme: "dark",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#17906A"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#272B29"; }}
                />
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: "#1A0505",
                    border: "0.5px solid #5A1A1A",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#E05555",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !tokenId.trim()}
                style={{
                  width: "100%",
                  backgroundColor: loading ? "#1FA87A" : "#17906A",
                  color: "#E8E6E0",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: loading || !tokenId.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: !tokenId.trim() ? 0.4 : 1,
                  transition: "background-color 0.15s",
                }}
              >
                {loading ? (
                  <>
                    <IconSpinner size={14} color="#E8E6E0" />
                    Recording on XRPL…
                  </>
                ) : (
                  <>
                    <IconShieldCheck size={14} color="#E8E6E0" />
                    Confirm &amp; generate QR
                  </>
                )}
              </button>
            </form>

            {result && confirmedTokenId && (
              <div
                style={{
                  marginTop: "1rem",
                  border: "0.5px solid #174A3A",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#0A2820",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <IconCircleCheck size={16} color="#1FA87A" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#A8E8D0" }}>
                    Chain of custody complete
                  </span>
                </div>
                <div style={{ backgroundColor: "#1C1F1D", padding: 14 }}>
                  <InfoDividerRows
                    rows={[
                      { key: "Pharmacy address", value: result.actor },
                      { key: "Confirmed at", value: new Date(result.timestamp).toLocaleString() },
                    ]}
                  />
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #272B29" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "#6E6C66",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        marginBottom: 4,
                      }}
                    >
                      XRPL tx
                    </p>
                    <a
                      href={`https://livenet.xrpl.org/transactions/${result.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "#1FA87A",
                        wordBreak: "break-all",
                        textDecoration: "none",
                      }}
                    >
                      {result.txHash} ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — QR + Custody flow */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {verifyUrl && confirmedTokenId && (
              <div
                style={{
                  backgroundColor: "#1C1F1D",
                  border: "0.5px solid #272B29",
                  borderRadius: 12,
                  padding: "1.25rem",
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", marginBottom: 8 }}>
                  Patient QR code
                </p>
                <p style={{ fontSize: 12, color: "#6E6C66", lineHeight: 1.5, marginBottom: 14 }}>
                  Print on medication packaging. Patients scan to see the full verified custody chain.
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: 16,
                      border: "0.5px solid #272B29",
                      borderRadius: 8,
                    }}
                  >
                    <QRCode value={verifyUrl} size={180} />
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "#6E6C66",
                    textAlign: "center",
                    wordBreak: "break-all",
                    marginBottom: 10,
                  }}
                >
                  {verifyUrl}
                </p>
                <Link
                  href={`/verify/${confirmedTokenId}`}
                  target="_blank"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "8px 12px",
                    border: "0.5px solid #17906A",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#1FA87A",
                    textDecoration: "none",
                    backgroundColor: "#0A2820",
                    transition: "background-color 0.15s",
                  }}
                >
                  Preview verification page →
                </Link>
              </div>
            )}

            <div
              style={{
                backgroundColor: "#1C1F1D",
                border: "0.5px solid #272B29",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", marginBottom: "1rem" }}>
                Custody flow
              </p>
              <CustodyTimeline
                steps={[
                  { role: "MANUFACTURER", label: "Mint batch record", completed: true },
                  { role: "DISTRIBUTOR", label: "Confirm receipt", completed: true },
                  { role: "PHARMACY", label: "Confirm & generate QR", completed: !!result, current: !result },
                ]}
              />
            </div>

          </div>
        </div>
      </main>

      {showToast && (
        <Toast message="Chain of custody complete — QR ready" onDone={() => setShowToast(false)} />
      )}
    </div>
  );
}

function InfoDividerRows({ rows }: { rows: { key: string; value: string }[] }) {
  return (
    <div>
      {rows.map((row, i) => (
        <div key={row.key}>
          {i > 0 && <div style={{ height: "0.5px", backgroundColor: "#272B29", margin: "8px 0" }} />}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6E6C66", flexShrink: 0 }}>{row.key}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "#E8E6E0",
                textAlign: "right",
                wordBreak: "break-all",
              }}
            >
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustodyTimeline({
  steps,
}: {
  steps: { role: string; label: string; completed: boolean; current?: boolean }[];
}) {
  return (
    <div style={{ position: "relative", paddingLeft: 20 }}>
      <div
        style={{ position: "absolute", left: 4, top: 8, bottom: 8, width: 1, backgroundColor: "#272B29" }}
      />
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: i < steps.length - 1 ? 20 : 0,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: step.completed ? "#17906A" : "#1C1F1D",
              border: step.current ? "0.5px solid #17906A" : step.completed ? "none" : "0.5px solid #272B29",
              flexShrink: 0,
              marginLeft: -16,
              marginTop: 3,
              zIndex: 1,
              position: "relative",
            }}
          />
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#6E6C66",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 2,
              }}
            >
              {step.role}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: step.current ? "#1FA87A" : "#E8E6E0" }}>
              {step.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="toast-animate"
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "50%",
        backgroundColor: "#12785A",
        color: "#E8E6E0",
        fontSize: 13,
        padding: "10px 18px",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 100,
        whiteSpace: "nowrap",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8E6E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2l4 -4" />
      </svg>
      {message}
    </div>
  );
}
