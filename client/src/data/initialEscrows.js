import { generateAddress, generateTxHash } from "../utils/helpers";

const INITIAL_ESCROWS = [
  {
    id: "esc_demo01",
    title: "MacBook Pro M3 \u2014 Like New",
    description:
      '2024 MacBook Pro 14" M3 Pro, 18GB RAM, 512GB SSD. Barely used.',
    amount: 0.085,
    status: "FUNDED",
    buyer: "alice",
    seller: "bob",
    arbiter: "system",
    escrowAddress: generateAddress(),
    txHash: generateTxHash(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    fundedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 11 * 86400000).toISOString(),
    history: [
      {
        action: "CREATED",
        by: "alice",
        at: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        action: "FUNDED",
        by: "alice",
        at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: "esc_demo02",
    title: "Vintage Guitar Pedal Collection",
    description: "5x Boss pedals from the 90s. All working perfectly.",
    amount: 0.032,
    status: "DELIVERED",
    buyer: "alice",
    seller: "charlie",
    arbiter: "system",
    escrowAddress: generateAddress(),
    txHash: generateTxHash(),
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    fundedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    deliveredAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    trackingInfo: "USPS 9400111899223033005001",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    history: [
      {
        action: "CREATED",
        by: "alice",
        at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        action: "FUNDED",
        by: "alice",
        at: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        action: "DELIVERED",
        by: "charlie",
        at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: "esc_demo03",
    title: "Logo Design \u2014 3 Concepts",
    description:
      "Professional logo design with 3 initial concepts and 2 revision rounds.",
    amount: 0.012,
    status: "RELEASED",
    buyer: "bob",
    seller: "alice",
    arbiter: "system",
    escrowAddress: generateAddress(),
    txHash: generateTxHash(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    fundedAt: new Date(Date.now() - 13 * 86400000).toISOString(),
    deliveredAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    releasedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    history: [
      {
        action: "CREATED",
        by: "bob",
        at: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        action: "FUNDED",
        by: "bob",
        at: new Date(Date.now() - 13 * 86400000).toISOString(),
      },
      {
        action: "DELIVERED",
        by: "alice",
        at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        action: "RELEASED",
        by: "bob",
        at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
  },
];

export default INITIAL_ESCROWS;
