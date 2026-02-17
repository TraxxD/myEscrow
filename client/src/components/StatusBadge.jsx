import { STATUS_CONFIG } from "../utils/constants";

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.5px",
        fontFamily: "'JetBrains Mono', monospace",
        border: `1px solid ${cfg.color}22`,
      }}
    >
      <span style={{ fontSize: 11 }}>{cfg.icon}</span> {cfg.label}
    </span>
  );
}
