"use client";

import { useState, FormEvent, useEffect } from "react";
import Nav from "@/components/Nav";
import { IconShieldCheck, IconSpinner } from "@/components/Icons";

interface MintResult {
  tokenId: string;
  txHash: string;
  manufacturerAddress: string;
  batchData: {
    drugName: string;
    batchNumber: string;
    quantity: string;
    manufacturingDate: string;
    mintedAt: string;
  };
}

export default function MintBatchPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => { if (d.address) setWalletAddress(d.address); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = {
      drugName: (form.elements.namedItem("drugName") as HTMLInputElement).value,
      batchNumber: (form.elements.namedItem("batchNumber") as HTMLInputElement).value,
      quantity: (form.elements.namedItem("quantity") as HTMLInputElement).value,
      manufacturingDate: (form.elements.namedItem("manufacturingDate") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Minting failed");
      setResult(json);
      form.reset();
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
          mint new batch
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

          {/* Left — Form */}
          <div
            style={{
              backgroundColor: "#1C1F1D",
              border: "0.5px solid #272B29",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormField label="Drug name" name="drugName" placeholder="e.g. Amoxicillin 500mg" required />
              <FormField label="Batch number" name="batchNumber" placeholder="e.g. BC-2024-00142" required />
              <FormField label="Quantity" name="quantity" type="number" placeholder="e.g. 500" required />
              <FormField label="Manufacturing date" name="manufacturingDate" type="date" required />
              <FormField label="Expiry date" name="expiryDate" type="date" />
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6E6C66", marginBottom: 5 }}>
                  Manufacturer wallet
                </label>
                <input
                  type="text"
                  readOnly
                  value={walletAddress || "Loading…"}
                  style={{
                    width: "100%",
                    fontSize: 13,
                    padding: "8px 10px",
                    border: "0.5px solid #272B29",
                    borderRadius: 8,
                    backgroundColor: "#111312",
                    color: "#6E6C66",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    cursor: "default",
                  }}
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
                disabled={loading}
                style={{
                  width: "100%",
                  backgroundColor: loading ? "#1FA87A" : "#17906A",
                  color: "#E8E6E0",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background-color 0.15s",
                  marginTop: 4,
                }}
              >
                {loading ? (
                  <>
                    <IconSpinner size={14} color="#E8E6E0" />
                    Anchoring on XRPL…
                  </>
                ) : (
                  <>
                    <IconShieldCheck size={14} color="#E8E6E0" />
                    Mint batch record
                  </>
                )}
              </button>
            </form>

            {/* Result after mint */}
            {result && (
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
                  <IconShieldCheck size={16} color="#1FA87A" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#A8E8D0" }}>
                    {result.batchData.drugName} · batch minted
                  </span>
                </div>
                <div style={{ padding: 14, backgroundColor: "#1C1F1D" }}>
                  <InfoDividerRows
                    rows={[
                      { key: "Drug", value: result.batchData.drugName },
                      { key: "Batch #", value: result.batchData.batchNumber },
                      { key: "Quantity", value: result.batchData.quantity },
                      { key: "Minted at", value: new Date(result.batchData.mintedAt).toLocaleString() },
                    ]}
                  />
                  <div style={{ marginTop: 12 }}>
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
                      Token ID
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "#1FA87A",
                        wordBreak: "break-all",
                        backgroundColor: "#111312",
                        borderRadius: 6,
                        padding: "6px 8px",
                      }}
                    >
                      {result.tokenId || "Extracting…"}
                    </p>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "0.5px solid #272B29",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#6E6C66", flexShrink: 0 }}>
                      XRPL tx
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "#1FA87A",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.txHash}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — Info cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                backgroundColor: "#1C1F1D",
                border: "0.5px solid #272B29",
                borderRadius: 12,
                padding: "1.25rem",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: "#E8E6E0", marginBottom: "1rem" }}>
                What gets anchored
              </p>
              <InfoDividerRows
                rows={[
                  { key: "Token type", value: "NFTokenMint (Non-Fungible)" },
                  { key: "URI metadata", value: "JSON-encoded batch data" },
                  { key: "Transferable", value: "No (burnable flag)" },
                  { key: "Network", value: "XRPL Testnet" },
                ]}
              />
            </div>

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
                  { role: "DISTRIBUTOR", label: "Confirm receipt", completed: false },
                  { role: "PHARMACY", label: "Confirm & generate QR", completed: false },
                ]}
              />
            </div>
          </div>
        </div>
      </main>

      {showToast && (
        <Toast message="Batch record minted on XRPL" onDone={() => setShowToast(false)} />
      )}
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} style={{ display: "block", fontSize: 12, color: "#6E6C66", marginBottom: 5 }}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          fontSize: 13,
          padding: "8px 10px",
          border: "0.5px solid #272B29",
          borderRadius: 8,
          backgroundColor: "#111312",
          color: "#E8E6E0",
          outline: "none",
          transition: "border-color 0.15s",
          colorScheme: "dark",
        }}
        onFocus={(e) => { e.target.style.borderColor = "#17906A"; }}
        onBlur={(e) => { e.target.style.borderColor = "#272B29"; }}
      />
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
            <span style={{ fontSize: 12, color: "#6E6C66" }}>{row.key}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#E8E6E0", textAlign: "right" }}>
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
  steps: { role: string; label: string; completed: boolean }[];
}) {
  return (
    <div style={{ position: "relative", paddingLeft: 20 }}>
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 8,
          bottom: 8,
          width: 1,
          backgroundColor: "#272B29",
        }}
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
              border: step.completed ? "none" : "0.5px solid #272B29",
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
            <p style={{ fontSize: 13, fontWeight: 600, color: "#E8E6E0" }}>{step.label}</p>
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
