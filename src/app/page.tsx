"use client";

import { type CSSProperties, type FormEvent, useEffect, useState } from "react";

type FaucetStatus = {
  operational: boolean;
  balance: string | null;
  amount: string;
  error?: string;
};

type RequestResult = {
  type: "success" | "error";
  message: string;
  hash?: string;
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "linear-gradient(135deg, rgba(44, 83, 100, 1) 0%, rgba(32, 58, 67, 1) 50%, rgba(15, 32, 39, 1) 100%)",
  },
  card: {
    width: "100%",
    maxWidth: "640px",
    borderRadius: "18px",
    padding: "24px",
    background: "#ffffff",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  heading: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },
  subheading: {
    margin: 0,
    color: "#4b5563",
    fontSize: "15px",
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    backgroundColor: "#f9fafb",
  },
  sectionTitle: {
    margin: "0 0 10px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#111827",
  },
  statusRow: {
    margin: "4px 0",
    color: "#374151",
    fontSize: "14px",
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    padding: "12px",
    fontSize: "14px",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "12px",
    width: "100%",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    opacity: 1,
  },
  buttonDisabled: {
    cursor: "not-allowed",
    opacity: 0.6,
  },
  successText: {
    color: "#166534",
    margin: "0 0 8px",
  },
  errorText: {
    color: "#991b1b",
    margin: "0 0 8px",
  },
  hashText: {
    margin: 0,
    wordBreak: "break-all",
    color: "#1f2937",
    fontSize: "13px",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    fontSize: "13px",
    color: "#6b7280",
  },
  link: {
    color: "#1d4ed8",
    textDecoration: "none",
  },
};

async function fetchStatus(): Promise<FaucetStatus> {
  const response = await fetch("/api/status", { cache: "no-store" });
  return (await response.json()) as FaucetStatus;
}

export default function Home() {
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [status, setStatus] = useState<FaucetStatus | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const statusResponse = await fetchStatus();
        if (active) {
          setStatus(statusResponse);
        }
      } catch {
        if (active) {
          setStatus({
            operational: false,
            balance: null,
            amount: "100",
            error: "Unable to fetch faucet status.",
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/request-xlm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicKey: publicKey.trim() }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        hash?: string;
        amount?: string;
        error?: string;
        nextAvailableAt?: string | null;
      };

      if (!response.ok || !data.success) {
        const retryText = data.nextAvailableAt
          ? ` Next eligible request: ${new Date(data.nextAvailableAt).toLocaleString()}.`
          : "";
        setResult({
          type: "error",
          message: `${data.error ?? "Request failed."}${retryText}`,
        });
        return;
      }

      setResult({
        type: "success",
        message: `Successfully sent ${data.amount ?? "configured"} XLM.`,
        hash: data.hash,
      });

      const statusResponse = await fetchStatus();
      setStatus(statusResponse);
    } catch {
      setResult({
        type: "error",
        message: "Unable to send request. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <main style={styles.card}>
        <header>
          <h1 style={styles.heading}>Stellar Testnet Faucet</h1>
          <p style={styles.subheading}>
            Request test XLM for development on Stellar testnet.
          </p>
        </header>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Faucet Status</h2>
          <p style={styles.statusRow}>
            Operational:{" "}
            <strong>{status?.operational ? "Yes" : "No"}</strong>
          </p>
          <p style={styles.statusRow}>
            Faucet Balance: <strong>{status?.balance ?? "Unavailable"} XLM</strong>
          </p>
          <p style={styles.statusRow}>
            Amount per Request:{" "}
            <strong>{status?.amount ?? process.env.NEXT_PUBLIC_FAUCET_AMOUNT_XLM ?? "100"} XLM</strong>
          </p>
          {status?.error ? <p style={styles.errorText}>{status.error}</p> : null}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Request XLM</h2>
          <form onSubmit={onSubmit}>
            <textarea
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="Paste your Stellar public key (G...)"
              style={styles.textarea}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Sending..." : "Request Test XLM"}
            </button>
          </form>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Result</h2>
          {!result ? (
            <p style={styles.statusRow}>No request submitted yet.</p>
          ) : (
            <>
              <p style={result.type === "success" ? styles.successText : styles.errorText}>
                {result.message}
              </p>
              {result.hash ? <p style={styles.hashText}>Transaction Hash: {result.hash}</p> : null}
            </>
          )}
        </section>

        <footer style={styles.footer}>
          <a
            href="https://developers.stellar.org/docs"
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Stellar Docs
          </a>
          <a
            href="https://stellar.expert/explorer/testnet"
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Testnet Explorer
          </a>
          <a
            href="https://horizon-testnet.stellar.org"
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Horizon API
          </a>
        </footer>
      </main>
    </div>
  );
}
