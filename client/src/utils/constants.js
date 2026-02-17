import palette from "../styles/palette";

export const STATUS_CONFIG = {
  CREATED: {
    label: "Created",
    color: palette.textMuted,
    bg: palette.surfaceAlt,
    icon: "\u23f3",
  },
  FUNDED: {
    label: "Funded",
    color: palette.accent,
    bg: "#2a1a08",
    icon: "\ud83d\udcb0",
  },
  DELIVERED: {
    label: "Delivered",
    color: palette.blue,
    bg: "#0a1a2a",
    icon: "\ud83d\udce6",
  },
  RELEASED: {
    label: "Released",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\u2705",
  },
  DISPUTED: {
    label: "Disputed",
    color: palette.red,
    bg: "#2a0a0a",
    icon: "\u26a0\ufe0f",
  },
  RESOLVED: {
    label: "Resolved",
    color: palette.purple,
    bg: "#1a0a2a",
    icon: "\u2696\ufe0f",
  },
  EXPIRED: {
    label: "Expired",
    color: palette.textDim,
    bg: palette.surfaceAlt,
    icon: "\u23f0",
  },
};

export const DEMO_USERS = {
  alice: {
    id: "usr_alice",
    username: "alice",
    email: "alice@demo.com",
    walletBalance: 2.5,
  },
  bob: {
    id: "usr_bob",
    username: "bob",
    email: "bob@demo.com",
    walletBalance: 1.8,
  },
  charlie: {
    id: "usr_charlie",
    username: "charlie",
    email: "charlie@demo.com",
    walletBalance: 0.5,
  },
};
