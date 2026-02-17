import { useState } from "react";
import palette from "../styles/palette";

export default function Card({ children, style, onClick, animate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: palette.surface,
        border: `1px solid ${
          hovered && onClick ? palette.borderLight : palette.border
        }`,
        borderRadius: 14,
        padding: 24,
        transition: "all 0.25s ease",
        cursor: onClick ? "pointer" : "default",
        transform: hovered && onClick ? "translateY(-2px)" : "none",
        animation: animate ? "fadeUp 0.4s ease both" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
