import palette from "../styles/palette";

export const STATUS_CONFIG = {
  AWAITING_AGREEMENT: {
    label: "Awaiting Agreement",
    color: palette.yellow,
    bg: "#2a2408",
    icon: "\ud83e\udd1d",
  },
  CREATED: {
    label: "Ready to Fund",
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
  SHIPPED: {
    label: "Shipped",
    color: palette.blue,
    bg: "#0a1a2a",
    icon: "\ud83d\ude9a",
  },
  DELIVERED: {
    label: "Delivered",
    color: palette.blue,
    bg: "#0a1a2a",
    icon: "\ud83d\udce6",
  },
  INSPECTION: {
    label: "Inspection",
    color: palette.purple,
    bg: "#1a0a2a",
    icon: "\ud83d\udd0d",
  },
  ACCEPTED: {
    label: "Accepted",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\ud83d\udc4d",
  },
  RELEASED: {
    label: "Released",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\u2705",
  },
  REJECTED: {
    label: "Rejected",
    color: palette.red,
    bg: "#2a0a0a",
    icon: "\ud83d\udc4e",
  },
  RETURN_SHIPPED: {
    label: "Return Shipped",
    color: palette.yellow,
    bg: "#2a2408",
    icon: "\ud83d\udce8",
  },
  REFUNDED: {
    label: "Refunded",
    color: palette.textMuted,
    bg: palette.surfaceAlt,
    icon: "\ud83d\udcb8",
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
  // Timeline-only entries
  BUYER_AGREED: {
    label: "Buyer Agreed",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\u2714\ufe0f",
  },
  SELLER_AGREED: {
    label: "Seller Agreed",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\u2714\ufe0f",
  },
  BOTH_AGREED: {
    label: "Both Agreed",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\ud83e\udd1d",
  },
  RECEIVED: {
    label: "Received",
    color: palette.blue,
    bg: "#0a1a2a",
    icon: "\ud83d\udce5",
  },
  AUTO_ACCEPTED: {
    label: "Auto-Accepted",
    color: palette.green,
    bg: "#0a2a1a",
    icon: "\u23f1\ufe0f",
  },
};

export const TERMINAL_STATUSES = ["RELEASED", "ACCEPTED", "RESOLVED", "REFUNDED", "EXPIRED"];

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
