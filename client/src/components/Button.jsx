import { useState } from "react";
import palette from "../styles/palette";

const VARIANTS = {
  primary: {
    bg: palette.accent,
    color: "#000",
    hoverBg: palette.accentDark,
    border: "none",
  },
  secondary: {
    bg: "transparent",
    color: palette.text,
    hoverBg: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
  },
  danger: {
    bg: palette.redDark,
    color: palette.text,
    hoverBg: palette.red,
    border: "none",
  },
  ghost: {
    bg: "transparent",
    color: palette.textMuted,
    hoverBg: palette.surfaceAlt,
    border: "none",
  },
  success: {
    bg: palette.greenDark,
    color: "#fff",
    hoverBg: palette.green,
    border: "none",
  },
};

const SIZES = {
  sm: { p: "6px 12px", f: 12 },
  md: { p: "10px 20px", f: 14 },
  lg: { p: "14px 28px", f: 15 },
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  style: customStyle,
}) {
  const [hovered, setHovered] = useState(false);
  const s = VARIANTS[variant];
  const sz = SIZES[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: sz.p,
        fontSize: sz.f,
        fontWeight: 600,
        fontFamily: "'Outfit', sans-serif",
        background: disabled
          ? palette.surfaceAlt
          : hovered
          ? s.hoverBg
          : s.bg,
        color: disabled ? palette.textDim : s.color,
        border: s.border,
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.5 : 1,
        ...customStyle,
      }}
    >
      {children}
    </button>
  );
}
