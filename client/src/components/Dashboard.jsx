import { useState } from "react";
import palette from "../styles/palette";
import { STATUS_CONFIG } from "../utils/constants";
import { formatBTC, formatDate, daysRemaining } from "../utils/helpers";
import Card from "./Card";
import Button from "./Button";
import StatusBadge from "./StatusBadge";
import * as Icons from "./Icons";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "buying", label: "Buying" },
  { id: "selling", label: "Selling" },
  { id: "completed", label: "Completed" },
];

const TERMINAL = ["RELEASED", "ACCEPTED", "RESOLVED", "EXPIRED", "REFUNDED"];

export default function Dashboard({
  currentUser,
  escrows,
  loading,
  onCreateNew,
  onSelectEscrow,
  onOpenAdmin,
  onOpenWallet,
}) {
  const [filter, setFilter] = useState("all");

  const myEscrows = escrows.filter(
    (e) =>
      e.buyer === currentUser.username || e.seller === currentUser.username
  );

  const filtered = myEscrows.filter((e) => {
    if (filter === "active") return !TERMINAL.includes(e.status);
    if (filter === "buying") return e.buyer === currentUser.username;
    if (filter === "selling") return e.seller === currentUser.username;
    if (filter === "completed") return TERMINAL.includes(e.status);
    return true;
  });

  const activeCount = myEscrows.filter((e) => !TERMINAL.includes(e.status)).length;
  const totalVolume = myEscrows.reduce((sum, e) => sum + e.amount, 0);
  const completedCount = myEscrows.filter((e) => ["RELEASED", "ACCEPTED"].includes(e.status)).length;

  const stats = [
    {
      label: "Wallet",
      value: formatBTC(currentUser.walletBalance),
      color: palette.accent,
      icon: <Icons.Wallet />,
      clickable: !!onOpenWallet,
      onClick: onOpenWallet,
    },
    {
      label: "Active",
      value: activeCount,
      color: palette.blue,
      icon: <Icons.Shield />,
    },
    {
      label: "Completed",
      value: completedCount,
      color: palette.green,
      icon: <Icons.Check />,
    },
    {
      label: "Volume",
      value: formatBTC(totalVolume),
      color: palette.purple,
      icon: <Icons.Bitcoin />,
    },
  ];

  return (
    <div>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {stats.map((s, i) => (
          <Card
            key={i}
            animate
            onClick={s.onClick}
            style={{
              animationDelay: `${i * 0.08}s`,
              cursor: s.clickable ? "pointer" : "default",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ color: s.color }}>{s.icon}</span>
              <span
                style={{
                  fontSize: 11,
                  color: palette.textDim,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                {s.label.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: palette.text,
                fontFamily:
                  typeof s.value === "string"
                    ? "'JetBrains Mono', monospace"
                    : "'Outfit', sans-serif",
              }}
            >
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>
          Your Escrows
        </h2>
        <div style={{ display: "flex", gap: 10 }}>
          {currentUser.role === "admin" && onOpenAdmin && (
            <Button variant="secondary" onClick={onOpenAdmin}>
              <Icons.Shield /> Admin
            </Button>
          )}
          <Button onClick={onCreateNew}>
            <Icons.Plus /> New Escrow
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              border: `1px solid ${filter === f.id ? palette.accent : palette.border}`,
              background: filter === f.id ? palette.accent + "14" : "transparent",
              color: filter === f.id ? palette.accent : palette.textMuted,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {f.label}
            {f.id === "active" && activeCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: palette.blue + "22",
                  color: palette.blue,
                  fontWeight: 700,
                }}
              >
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Escrow List */}
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
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ color: palette.textDim, marginBottom: 8 }}>
            <Icons.Shield />
          </div>
          <p style={{ color: palette.textMuted, fontSize: 14 }}>
            {filter === "all"
              ? "No escrows yet. Create your first one!"
              : `No ${filter} escrows found.`}
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((e, i) => (
            <Card
              key={e.id}
              onClick={() => onSelectEscrow(e)}
              animate
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 16 }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background:
                      STATUS_CONFIG[e.status]?.bg || palette.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {STATUS_CONFIG[e.status]?.icon || "\ud83d\udccb"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: palette.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.title}
                    </span>
                    <StatusBadge status={e.status} />
                    {e.category && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: palette.surfaceAlt,
                          color: palette.textDim,
                          fontWeight: 600,
                        }}
                      >
                        {e.category}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: palette.textDim,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icons.User />
                      {e.buyer === currentUser.username
                        ? `\u2192 ${e.seller}`
                        : `\u2190 ${e.buyer}`}
                    </span>
                    <span>&middot;</span>
                    <span>{formatDate(e.createdAt)}</span>
                    {!TERMINAL.includes(e.status) && (
                      <>
                        <span>&middot;</span>
                        <span
                          style={{
                            color:
                              daysRemaining(e.expiresAt) < 3
                                ? palette.red
                                : palette.textDim,
                          }}
                        >
                          {daysRemaining(e.expiresAt)}d left
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: palette.accent,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {formatBTC(e.amount)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: palette.textDim,
                      marginTop: 2,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {e.buyer === currentUser.username ? "buying" : "selling"}
                  </div>
                </div>
                <div style={{ color: palette.textDim, flexShrink: 0 }}>
                  <Icons.ArrowRight />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
