export const generateId = () => Math.random().toString(36).slice(2, 10);

export const generateAddress = () =>
  "3" +
  Array.from(
    { length: 33 },
    () =>
      "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[
        Math.floor(Math.random() * 58)
      ]
  ).join("");

export const generateTxHash = () =>
  Array.from(
    { length: 64 },
    () => "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("");

export const formatBTC = (amount) => `₿ ${amount.toFixed(4)}`;

export const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const truncate = (s, n = 12) =>
  s ? `${s.slice(0, n)}...${s.slice(-4)}` : "";

export const daysRemaining = (expiresAt) => {
  const d = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000);
  return d > 0 ? d : 0;
};
