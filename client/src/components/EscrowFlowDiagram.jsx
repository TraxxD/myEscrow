import palette from "../styles/palette";

const STEPS = [
  { key: "AWAITING_AGREEMENT", label: "Agree", icon: "\ud83e\udd1d" },
  { key: "CREATED", label: "Fund", icon: "\ud83d\udcb0" },
  { key: "FUNDED", label: "Funded", icon: "\ud83d\udcb0" },
  { key: "SHIPPED", label: "Shipped", icon: "\ud83d\ude9a" },
  { key: "INSPECTION", label: "Inspect", icon: "\ud83d\udd0d" },
  { key: "RELEASED", label: "Released", icon: "\u2705" },
];

const STATUS_ORDER = {
  AWAITING_AGREEMENT: 0,
  CREATED: 1,
  FUNDED: 2,
  SHIPPED: 3,
  DELIVERED: 3,
  INSPECTION: 4,
  ACCEPTED: 5,
  RELEASED: 5,
  REJECTED: 4,
  RETURN_SHIPPED: 4,
  REFUNDED: 5,
  DISPUTED: -1,
  RESOLVED: -1,
};

export default function EscrowFlowDiagram({ currentStatus }) {
  const currentIdx = STATUS_ORDER[currentStatus] ?? -1;
  const isTerminal = ["RELEASED", "ACCEPTED", "REFUNDED"].includes(currentStatus);
  const isDisputed = currentStatus === "DISPUTED" || currentStatus === "RESOLVED";
  const isRejected = ["REJECTED", "RETURN_SHIPPED", "REFUNDED"].includes(currentStatus);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "16px 0",
        overflowX: "auto",
      }}
    >
      {STEPS.map((step, i) => {
        const isPast = i < currentIdx || isTerminal;
        const isCurrent = i === currentIdx && !isTerminal;
        const isFuture = i > currentIdx && !isTerminal;

        return (
          <div
            key={step.key}
            style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isPast
                    ? palette.green + "22"
                    : isCurrent
                    ? palette.accent + "22"
                    : palette.surfaceAlt,
                  border: `2px solid ${
                    isPast
                      ? palette.green
                      : isCurrent
                      ? palette.accent
                      : palette.border
                  }`,
                  fontSize: 14,
                  animation: isCurrent ? "pulse-glow 2s infinite" : "none",
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  color: isPast
                    ? palette.green
                    : isCurrent
                    ? palette.accent
                    : palette.textDim,
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 4px",
                  background: isPast ? palette.green + "44" : palette.border,
                  marginBottom: 22,
                  minWidth: 8,
                }}
              />
            )}
          </div>
        );
      })}
      {(isDisputed || isRejected) && (
        <div
          style={{
            marginLeft: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isRejected
                ? palette.yellow + "22"
                : currentStatus === "RESOLVED"
                ? palette.purple + "22"
                : palette.red + "22",
              border: `2px solid ${
                isRejected
                  ? palette.yellow
                  : currentStatus === "RESOLVED"
                  ? palette.purple
                  : palette.red
              }`,
              fontSize: 14,
            }}
          >
            {isRejected
              ? currentStatus === "REFUNDED" ? "\ud83d\udcb8" : "\ud83d\udc4e"
              : currentStatus === "RESOLVED" ? "\u2696\ufe0f" : "\u26a0\ufe0f"}
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.5px",
              color: isRejected
                ? palette.yellow
                : currentStatus === "RESOLVED"
                ? palette.purple
                : palette.red,
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: "nowrap",
            }}
          >
            {isRejected
              ? currentStatus === "REFUNDED" ? "Refunded" : currentStatus === "RETURN_SHIPPED" ? "Returning" : "Rejected"
              : currentStatus === "RESOLVED" ? "Resolved" : "Disputed"}
          </span>
        </div>
      )}
    </div>
  );
}
