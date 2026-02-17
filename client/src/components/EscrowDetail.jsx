import { useState } from "react";
import palette from "../styles/palette";
import { STATUS_CONFIG, TERMINAL_STATUSES } from "../utils/constants";
import { formatBTC, formatDate, formatTime, daysRemaining } from "../utils/helpers";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import StatusBadge from "./StatusBadge";
import EscrowFlowDiagram from "./EscrowFlowDiagram";
import MessagePanel from "./MessagePanel";
import * as Icons from "./Icons";

export default function EscrowDetail({ escrow, currentUser, onAction, onBack }) {
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showChainDetails, setShowChainDetails] = useState(false);

  const isBuyer = escrow.buyer === currentUser.username;
  const isSeller = escrow.seller === currentUser.username;
  const isAdmin = currentUser.role === "admin";
  const isTerminal = TERMINAL_STATUSES.includes(escrow.status);

  const copyAddress = () => {
    navigator.clipboard?.writeText(escrow.escrowAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inspectionDaysLeft = escrow.inspectionDeadline
    ? Math.max(0, Math.ceil((new Date(escrow.inspectionDeadline) - Date.now()) / 86400000))
    : null;

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span
              style={{
                fontSize: 12,
                color: palette.textDim,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {escrow.id}
            </span>
            {escrow.category && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: palette.accent + "14",
                  color: palette.accent,
                  fontWeight: 600,
                }}
              >
                {escrow.category}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={escrow.status} />
      </div>

      {/* Flow Diagram */}
      <Card style={{ marginBottom: 16 }}>
        <EscrowFlowDiagram currentStatus={escrow.status} />
      </Card>

      {/* Inspection deadline banner */}
      {escrow.status === "INSPECTION" && inspectionDaysLeft !== null && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: palette.purple + "10",
            border: `1px solid ${palette.purple}30`,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, color: palette.purple, fontWeight: 600 }}>
            Inspection Period
          </span>
          <span
            style={{
              fontSize: 13,
              color: inspectionDaysLeft <= 1 ? palette.red : palette.purple,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {inspectionDaysLeft} day{inspectionDaysLeft !== 1 ? "s" : ""} remaining
          </span>
        </div>
      )}

      {/* Agreement status banner */}
      {escrow.status === "AWAITING_AGREEMENT" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: palette.yellow + "10",
            border: `1px solid ${palette.yellow}30`,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, color: palette.yellow, fontWeight: 600, marginBottom: 4 }}>
            Both parties must agree to the terms
          </p>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: palette.textMuted }}>
            <span>
              Buyer: {escrow.buyerAgreed ? "\u2705 Agreed" : "\u23f3 Pending"}
            </span>
            <span>
              Seller: {escrow.sellerAgreed ? "\u2705 Agreed" : "\u23f3 Pending"}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Amount & Blockchain Info */}
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
              marginBottom: 4,
            }}
          >
            {formatBTC(escrow.amount)}
          </div>
          {escrow.amountSatoshis && (
            <div
              style={{
                fontSize: 11,
                color: palette.textDim,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 12,
              }}
            >
              {Number(escrow.amountSatoshis).toLocaleString()} sats
            </div>
          )}

          {/* Network badge */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: palette.accent + "14",
                color: palette.accent,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              TESTNET
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: palette.green + "14",
                color: palette.green,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              2-of-3 MULTISIG
            </span>
            {escrow.confirmations > 0 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: palette.blue + "14",
                  color: palette.blue,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {escrow.confirmations} CONF
              </span>
            )}
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
            ESCROW ADDRESS (P2SH)
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: palette.bg,
              marginBottom: 6,
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
          {escrow.escrowAddress && (
            <a
              href={`https://mempool.space/testnet/address/${escrow.escrowAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: palette.accent,
                fontFamily: "'JetBrains Mono', monospace",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginBottom: 10,
              }}
            >
              View on mempool.space &rarr;
            </a>
          )}

          {/* Release TX hash */}
          {escrow.releaseTxHash && (
            <>
              <div style={{ fontSize: 12, color: palette.textDim, marginBottom: 6, marginTop: 8, fontWeight: 600, letterSpacing: "0.5px" }}>
                RELEASE TX
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: palette.bg,
                  fontSize: 11,
                  color: palette.green,
                  fontFamily: "'JetBrains Mono', monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {escrow.releaseTxHash}
              </div>
            </>
          )}

          {/* Expandable chain details */}
          <button
            onClick={() => setShowChainDetails(!showChainDetails)}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: palette.textDim,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              padding: "4px 0",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {showChainDetails ? "\u25BC" : "\u25B6"} Chain Details
          </button>

          {showChainDetails && (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 8,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {escrow.derivationIndex != null && (
                <div>
                  <span style={{ color: palette.textDim }}>Derivation Index: </span>
                  <span style={{ color: palette.text }}>{escrow.derivationIndex}</span>
                </div>
              )}
              {escrow.buyerPubKey && (
                <div>
                  <span style={{ color: palette.textDim }}>Buyer PubKey: </span>
                  <span style={{ color: palette.textMuted, wordBreak: "break-all" }}>{escrow.buyerPubKey}</span>
                </div>
              )}
              {escrow.sellerPubKey && (
                <div>
                  <span style={{ color: palette.textDim }}>Seller PubKey: </span>
                  <span style={{ color: palette.textMuted, wordBreak: "break-all" }}>{escrow.sellerPubKey}</span>
                </div>
              )}
              {escrow.platformPubKey && (
                <div>
                  <span style={{ color: palette.textDim }}>Platform PubKey: </span>
                  <span style={{ color: palette.textMuted, wordBreak: "break-all" }}>{escrow.platformPubKey}</span>
                </div>
              )}
              {escrow.redeemScript && (
                <div>
                  <span style={{ color: palette.textDim }}>Redeem Script: </span>
                  <span style={{ color: palette.textMuted, wordBreak: "break-all", fontSize: 10 }}>{escrow.redeemScript}</span>
                </div>
              )}
              {escrow.platformFee > 0 && (
                <div>
                  <span style={{ color: palette.textDim }}>Platform Fee: </span>
                  <span style={{ color: palette.yellow }}>{formatBTC(escrow.platformFee)}</span>
                </div>
              )}
            </div>
          )}

          {escrow.inspectionDays && (
            <div style={{ marginTop: 10, fontSize: 12, color: palette.textDim }}>
              Inspection period: <strong style={{ color: palette.text }}>{escrow.inspectionDays} day{escrow.inspectionDays > 1 ? "s" : ""}</strong>
            </div>
          )}
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

      {/* Tracking Info */}
      {escrow.trackingInfo && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: palette.textDim, marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px" }}>
            SHIPPING TRACKING
          </div>
          <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: palette.text }}>
            {escrow.trackingInfo}
          </div>
          {escrow.returnTrackingInfo && (
            <>
              <div style={{ fontSize: 12, color: palette.textDim, marginTop: 12, marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px" }}>
                RETURN TRACKING
              </div>
              <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: palette.text }}>
                {escrow.returnTrackingInfo}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Actions */}
      {!isTerminal && (
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Agree */}
            {escrow.status === "AWAITING_AGREEMENT" && (isBuyer || isSeller) && (
              <Button
                onClick={() => onAction("agree")}
                size="lg"
                disabled={
                  (isBuyer && escrow.buyerAgreed) ||
                  (isSeller && escrow.sellerAgreed)
                }
              >
                {"\ud83e\udd1d"} Agree to Terms
              </Button>
            )}

            {/* Fund */}
            {escrow.status === "CREATED" && isBuyer && (
              <Button onClick={() => onAction("fund")} size="lg">
                <Icons.Lock /> Fund Escrow
              </Button>
            )}

            {/* Ship */}
            {escrow.status === "FUNDED" && isSeller && (
              <Button onClick={() => setShowShip(!showShip)} size="lg">
                {"\ud83d\ude9a"} Ship Item
              </Button>
            )}

            {/* Receive (buyer marks received) */}
            {escrow.status === "SHIPPED" && isBuyer && (
              <Button onClick={() => onAction("receive")} size="lg">
                {"\ud83d\udce5"} Mark Received
              </Button>
            )}

            {/* Accept (during inspection) */}
            {escrow.status === "INSPECTION" && isBuyer && (
              <Button
                variant="success"
                onClick={() => onAction("accept")}
                size="lg"
              >
                <Icons.Check /> Accept & Release
              </Button>
            )}

            {/* Reject (during inspection) */}
            {escrow.status === "INSPECTION" && isBuyer && (
              <Button
                variant="danger"
                onClick={() => setShowReject(!showReject)}
                size="lg"
              >
                {"\ud83d\udc4e"} Reject
              </Button>
            )}

            {/* Return Ship (buyer ships back) */}
            {escrow.status === "REJECTED" && isBuyer && (
              <Button onClick={() => setShowReturn(!showReturn)} size="lg">
                {"\ud83d\udce8"} Ship Return
              </Button>
            )}

            {/* Confirm return & refund (seller) */}
            {escrow.status === "RETURN_SHIPPED" && isSeller && (
              <Button
                variant="success"
                onClick={() => onAction("refund")}
                size="lg"
              >
                {"\ud83d\udcb8"} Confirm Return & Refund
              </Button>
            )}

            {/* Legacy backward compat: deliver/release */}
            {escrow.status === "DELIVERED" && isBuyer && (
              <Button
                variant="success"
                onClick={() => onAction("release")}
                size="lg"
              >
                <Icons.Check /> Release Funds
              </Button>
            )}

            {/* Dispute */}
            {["FUNDED", "SHIPPED", "DELIVERED", "INSPECTION", "REJECTED"].includes(escrow.status) && (isBuyer || isSeller) && (
              <Button
                variant="danger"
                onClick={() => setShowDispute(!showDispute)}
                size="lg"
              >
                <Icons.AlertTriangle /> Open Dispute
              </Button>
            )}

            {/* Messages toggle */}
            <Button
              variant="secondary"
              onClick={() => setShowMessages(!showMessages)}
              size="lg"
            >
              {"\ud83d\udcac"} {showMessages ? "Hide" : "Show"} Messages
            </Button>

            {/* Disputed info */}
            {escrow.status === "DISPUTED" && (
              <div
                style={{
                  flex: "1 1 100%",
                  padding: 16,
                  borderRadius: 10,
                  background: palette.red + "08",
                  border: `1px solid ${palette.red}22`,
                }}
              >
                <p style={{ fontSize: 13, color: palette.textMuted, marginBottom: 8 }}>
                  <strong style={{ color: palette.red }}>
                    Dispute opened
                  </strong>{" "}
                  by {escrow.dispute?.openedBy} — Awaiting admin resolution
                </p>
                <p style={{ fontSize: 12, color: palette.textDim }}>
                  Reason: {escrow.dispute?.reason || "Not specified"}
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {escrow.rejectionReason && (
              <div
                style={{
                  flex: "1 1 100%",
                  padding: 16,
                  borderRadius: 10,
                  background: palette.red + "08",
                  border: `1px solid ${palette.red}22`,
                }}
              >
                <p style={{ fontSize: 13, color: palette.red, fontWeight: 600, marginBottom: 4 }}>
                  Rejection Reason
                </p>
                <p style={{ fontSize: 12, color: palette.textMuted }}>
                  {escrow.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Ship form */}
          {showShip && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 10,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <Input
                label="TRACKING INFO"
                value={trackingInfo}
                onChange={setTrackingInfo}
                placeholder="Enter shipping tracking number..."
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Button variant="secondary" size="sm" onClick={() => setShowShip(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onAction("ship", { trackingInfo });
                    setShowShip(false);
                  }}
                  disabled={!trackingInfo}
                >
                  Confirm Shipment
                </Button>
              </div>
            </div>
          )}

          {/* Reject form */}
          {showReject && (
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
                label="REJECTION REASON"
                value={rejectReason}
                onChange={setRejectReason}
                placeholder="Describe why you're rejecting (min 10 chars)..."
                textarea
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Button variant="secondary" size="sm" onClick={() => setShowReject(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onAction("reject", { reason: rejectReason });
                    setShowReject(false);
                  }}
                  disabled={rejectReason.length < 10}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          )}

          {/* Return ship form */}
          {showReturn && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 10,
                background: palette.bg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <Input
                label="RETURN TRACKING INFO"
                value={returnTracking}
                onChange={setReturnTracking}
                placeholder="Enter return shipping tracking..."
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Button variant="secondary" size="sm" onClick={() => setShowReturn(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onAction("returnShip", { trackingInfo: returnTracking });
                    setShowReturn(false);
                  }}
                  disabled={!returnTracking}
                >
                  Confirm Return Shipment
                </Button>
              </div>
            </div>
          )}

          {/* Dispute form */}
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
                placeholder="Describe the issue (min 10 chars)..."
                textarea
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <Button variant="secondary" size="sm" onClick={() => setShowDispute(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onAction("dispute", { reason: disputeReason });
                    setShowDispute(false);
                  }}
                  disabled={disputeReason.length < 10}
                >
                  Submit Dispute
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Messages */}
      {showMessages && (
        <Card style={{ marginBottom: 16 }}>
          <MessagePanel escrowId={escrow.id} currentUser={currentUser} />
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
                <div style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>
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
                {h.details && (
                  <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 2 }}>
                    {h.details}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
