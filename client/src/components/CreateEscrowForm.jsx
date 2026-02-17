import { useState } from "react";
import palette from "../styles/palette";
import { formatBTC } from "../utils/helpers";
import Card from "./Card";
import Input from "./Input";
import Button from "./Button";
import * as Icons from "./Icons";

export default function CreateEscrowForm({
  currentUser,
  onSubmit,
  onCancel,
  initialCategory,
}) {
  const [title, setTitle] = useState(
    initialCategory ? `${initialCategory} Transaction` : ""
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [seller, setSeller] = useState("");
  const [days, setDays] = useState("14");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!title || !amount || !seller) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title, description, amount, seller, days });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <button
          onClick={onCancel}
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
        <h2 style={{ fontSize: 22, fontWeight: 700, color: palette.text }}>
          New Escrow
        </h2>
        {initialCategory && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: palette.accent,
              background: palette.accent + "14",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            {initialCategory}
          </span>
        )}
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {error && (
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: palette.red + "18",
                border: `1px solid ${palette.red}33`,
                color: palette.red,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <Input
            label="TITLE"
            value={title}
            onChange={setTitle}
            placeholder="What are you buying?"
          />
          <Input
            label="DESCRIPTION"
            value={description}
            onChange={setDescription}
            placeholder="Details about the transaction..."
            textarea
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <Input
              label="AMOUNT (BTC)"
              value={amount}
              onChange={setAmount}
              placeholder="0.05"
              type="number"
              mono
            />
            <Input
              label="EXPIRY (DAYS)"
              value={days}
              onChange={setDays}
              placeholder="14"
              type="number"
              mono
            />
          </div>

          <Input
            label="SELLER USERNAME"
            value={seller}
            onChange={setSeller}
            placeholder="Enter seller's username"
          />

          {amount && parseFloat(amount) > 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: palette.accent + "08",
                border: `1px solid ${palette.accent}22`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: palette.textMuted }}>
                  Escrow amount
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: palette.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatBTC(parseFloat(amount))}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: palette.textMuted }}>
                  Service fee (2%)
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: palette.textMuted,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatBTC(parseFloat(amount) * 0.02)}
                </span>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${palette.border}`,
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: palette.text,
                    fontWeight: 600,
                  }}
                >
                  Seller receives
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: palette.green,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatBTC(parseFloat(amount) * 0.98)}
                </span>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !title || !amount || !seller || parseFloat(amount) <= 0 || submitting
              }
            >
              {submitting ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              ) : (
                <>
                  <Icons.Shield /> Create Escrow
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
