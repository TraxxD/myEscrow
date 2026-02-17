import palette from "../styles/palette";

const STEPS = [
  { key: "CREATED", label: "Created", icon: "\ud83d\udcdd" },
  { key: "FUNDED", label: "Funded", icon: "\ud83d\udcb0" },
  { key: "DELIVERED", label: "Delivered", icon: "\ud83d\udce6" },
  { key: "RELEASED", label: "Released", icon: "\u2705" },
];

export default function EscrowFlowDiagram({ currentStatus }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);
  const isDisputed =
    currentStatus === "DISPUTED" || currentStatus === "RESOLVED";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "16px 0",
      }}
    >
      {STEPS.map((step, i) => {
        const isPast = i < currentIdx || currentStatus === "RELEASED";
        const isCurrent = i === currentIdx && currentStatus !== "RELEASED";
        const isFuture = i > currentIdx;

        return (
          <div
            key={step.key}
            style={{ display: "flex", alignItems: "center", flex: 1 }}
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
                  width: 36,
                  height: 36,
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
                  fontSize: 16,
                  animation: isCurrent ? "pulse-glow 2s infinite" : "none",
                }}
              >
                {step.icon}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  color: isPast
                    ? palette.green
                    : isCurrent
                    ? palette.accent
                    : palette.textDim,
                  fontFamily: "'JetBrains Mono', monospace",
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
                  margin: "0 8px",
                  background: isPast ? palette.green + "44" : palette.border,
                  marginBottom: 22,
                }}
              />
            )}
          </div>
        );
      })}
      {isDisputed && (
        <div
          style={{
            marginLeft: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                currentStatus === "RESOLVED"
                  ? palette.purple + "22"
                  : palette.red + "22",
              border: `2px solid ${
                currentStatus === "RESOLVED" ? palette.purple : palette.red
              }`,
              fontSize: 16,
            }}
          >
            {currentStatus === "RESOLVED" ? "\u2696\ufe0f" : "\u26a0\ufe0f"}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.5px",
              color:
                currentStatus === "RESOLVED" ? palette.purple : palette.red,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {currentStatus === "RESOLVED" ? "Resolved" : "Disputed"}
          </span>
        </div>
      )}
    </div>
  );
}
