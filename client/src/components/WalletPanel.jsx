import { useState, useEffect } from "react";
import palette from "../styles/palette";
import * as api from "../services/api";
import Card from "./Card";
import * as Icons from "./Icons";
import { formatBTC, formatDate } from "../utils/helpers";

const TX_ICONS = {
  ESCROW_FUND: { icon: "\ud83d\udcb0", color: palette.red, label: "Funded Escrow" },
  ESCROW_RELEASE: { icon: "\u2705", color: palette.green, label: "Funds Released" },
  ESCROW_REFUND: { icon: "\ud83d\udcb8", color: palette.yellow, label: "Refund" },
};

export default function WalletPanel({ currentUser, onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const txs = await api.getWalletTransactions();
      setTransactions(txs);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: palette.textMuted, cursor: "pointer", padding: 4 }}
        >
          <Icons.Back />
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h2>
      </div>

      {/* Balance card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, color: palette.textDim, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 8 }}>
              AVAILABLE BALANCE
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: palette.accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {formatBTC(currentUser.walletBalance)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: palette.accent + "14", color: palette.accent, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              TESTNET
            </span>
            <span style={{ fontSize: 11, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              Simulated BTC
            </span>
          </div>
        </div>
      </Card>

      {/* Transactions */}
      <div style={{ fontSize: 12, color: palette.textDim, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 12 }}>
        TRANSACTION HISTORY
      </div>

      {loading ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <span
            style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: `3px solid ${palette.border}`,
              borderTopColor: palette.accent,
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        </Card>
      ) : transactions.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: palette.textMuted, fontSize: 14 }}>No transactions yet</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {transactions.map((tx) => {
            const cfg = TX_ICONS[tx.type] || { icon: "\ud83d\udcb3", color: palette.textMuted, label: tx.type };
            const isPositive = tx.amount > 0;
            return (
              <Card key={tx.id} style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: cfg.color + "14",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: palette.text }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: palette.textDim }}>
                      {tx.escrowTitle || tx.escrowId} &middot; {formatDate(tx.timestamp)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isPositive ? palette.green : palette.red,
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}
                  >
                    {isPositive ? "+" : ""}{formatBTC(Math.abs(tx.amount))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
