import palette from "../styles/palette";

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  textarea,
}) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: palette.textMuted,
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </label>
      )}
      <Tag
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 3 : undefined}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: palette.bg,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          fontSize: 14,
          outline: "none",
          fontFamily: mono
            ? "'JetBrains Mono', monospace"
            : "'Outfit', sans-serif",
          resize: textarea ? "vertical" : undefined,
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = palette.accent)}
        onBlur={(e) => (e.target.style.borderColor = palette.border)}
      />
    </div>
  );
}
