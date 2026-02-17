import { useState } from "react";
import palette from "../styles/palette";
import { STATUS_CONFIG } from "../utils/constants";
import { formatBTC, formatDate, formatTime, daysRemaining } from "../utils/helpers";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import StatusBadge from "./StatusBadge";
import EscrowFlowDiagram from "./EscrowFlowDiagram";
import * as Icons from "./Icons";

export default function EscrowDetail({ escrow, currentUser, onAction, onBack }) {
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [copied, setCopied] = useState(false);
  const isBuyer = escrow.buyer === currentUser.username;
  const isSeller = escrow.seller === currentUser.username;

  const copyAddress = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: palette.textMuted,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <Icons.Back />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: palette.text }}>
            {escrow.title}
          </h2>
          <span
            style={{
              fontSize: 12,
              color: palette.textDim,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {escrow.id}
          </span>
        </div>
        <StatusBadge status={escrow.status} />
      </div>

      {/* Flow Diagram */}
      <Card style={{ marginBottom: 16 }}>
        <EscrowFlowDiagram currentStatus={escrow.status} />
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Amount & Address */}
        <Card>
          <div
            style={{
              fontSize: 12,
              color: palette.textDim,
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            ESCROW AMOUNT
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: palette.accent,
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 16,
            }}
          >
            {formatBTC(escrow.amount)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: palette.textDim,
              marginBottom: 6,
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            ESCROW ADDRESS
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: palette.bg,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: palette.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {escrow.escrowAddress}
            </span>
            <button
              onClick={copyAddress}
              style={{
                background: "none",
                border: "none",
                color: copied ? palette.green : palette.textDim,
                cursor: "pointer",
                padding: 4,
              }}
            >
              {copied ? <Icons.Check /> : <Icons.Copy />}
            </button>
          </div>
        </Card>

        {/* Parties */}
        <Card>
          <div
            style={{
              fontSize: 12,
              color: palette.textDim,
              marginBottom: 12,
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            PARTIES
          </div>
          {[
            { label: "Buyer", user: escrow.buyer, isYou: isBuyer },
            { label: "Seller", user: escrow.seller, isYou: isSeller },
            { label: "Arbiter", user: escrow.arbiter },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  p.label !== "Arbiter"
                    ? `1px solid ${palette.border}`
                    : "none",
              }}
            >
              <span style={{ fontSize: 12, color: palette.textDim }}>
                {p.label}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: palette.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {p.user}
                </span>
                {p.isYou && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: palette.accent + "22",
                      color: palette.accent,
                      fontWeight: 700,
                    }}
                  >
                    YOU
                  </span>
                )}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: palette.bg,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: palette.textDim,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icons.Clock /> Expires
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color:
                  daysRemaining(escrow.expiresAt) < 3
                    ? palette.red
                    : palette.textMuted,
              }}
            >
              {daysRemaining(escrow.expiresAt)} days
            </span>
          </div>
        </Card>
      </div>

      {/* Actions */}
      {escrow.status !== "RELEASED" &&
        escrow.status !== "RESOLVED" &&
        escrow.status !== "EXPIRED" && (
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: palette.textDim,
                marginBottom: 16,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              ACTIONS
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {escrow.status === "CREATED" && isBuyer && (
                <Button onClick={() => onAction("fund")} size="lg">
                  <Icons.Lock /> Fund Escrow
                </Button>
              )}
              {escrow.status === "FUNDED" && isSeller && (
                <Button onClick={() => onAction("deliver")} size="lg">
                  {"\ud83d\udce6"} Mark as Delivered
                </Button>
              )}
              {escrow.status === "DELIVERED" && isBuyer && (
                <Button
                  variant="success"
                  onClick={() => onAction("release")}
                  size="lg"
                >
                  <Icons.Check /> Release Funds
                </Button>
              )}
              {["FUNDED", "DELIVERED"].includes(escrow.status) && (
                <Button
                  variant="danger"
                  onClick={() => setShowDispute(!showDispute)}
                  size="lg"
                >
                  <Icons.AlertTriangle /> Open Dispute
                </Button>
              )}
              {escrow.status === "DISPUTED" && (
                <div
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 10,
                    background: palette.red + "08",
                    border: `1px solid ${palette.red}22`,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: palette.textMuted,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ color: palette.red }}>
                      Dispute opened
                    </strong>{" "}
                    — Awaiting arbiter resolution
                  </p>
                  <p style={{ fontSize: 12, color: palette.textDim }}>
                    Reason: {escrow.dispute?.reason || "Not specified"}
                  </p>
                </div>
              )}
            </div>

            {showDispute && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  borderRadius: 10,
                  background: palette.bg,
                  border: `1px solid ${palette.red}22`,
                }}
              >
                <Input
                  label="DISPUTE REASON"
                  value={disputeReason}
                  onChange={setDisputeReason}
                  placeholder="Describe the issue..."
                  textarea
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDispute(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onAction("dispute", { reason: disputeReason });
                      setShowDispute(false);
                    }}
                    disabled={!disputeReason}
                  >
                    Submit Dispute
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

      {/* Timeline */}
      <Card>
        <div
          style={{
            fontSize: 12,
            color: palette.textDim,
            marginBottom: 16,
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          TIMELINE
        </div>
        {escrow.history?.map((h, i) => {
          const cfg = STATUS_CONFIG[h.action] || STATUS_CONFIG.CREATED;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                paddingBottom: 16,
                borderLeft:
                  i < escrow.history.length - 1
                    ? `2px solid ${palette.border}`
                    : "2px solid transparent",
                marginLeft: 9,
                paddingLeft: 20,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -7,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: cfg.color,
                  border: `2px solid ${palette.surface}`,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: palette.text,
                  }}
                >
                  {cfg.icon} {cfg.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: palette.textDim,
                    marginTop: 2,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  by {h.by} · {formatDate(h.at)} {formatTime(h.at)}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
