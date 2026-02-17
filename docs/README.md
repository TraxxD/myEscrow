# Bitcoin Escrow — Full-Stack Application

## What is Bitcoin Escrow?

Bitcoin escrow is a **trust mechanism** for peer-to-peer transactions. It solves the fundamental problem of online commerce: *"How do I send money to a stranger without getting scammed?"*

### The Core Problem

In a direct Bitcoin transaction:
- **Buyer risk**: You send BTC first → seller disappears.
- **Seller risk**: You ship goods first → buyer never pays.

Neither party trusts the other. Enter: **escrow**.

### How Bitcoin Escrow Works

```
┌─────────┐       ┌──────────────┐       ┌──────────┐
│  BUYER  │──BTC─▶│  ESCROW HOLD │──BTC─▶│  SELLER  │
└─────────┘       └──────────────┘       └──────────┘
     │                   │                     │
     │   1. Buyer        │   2. Escrow holds   │   3. Buyer confirms
     │   deposits BTC    │   funds securely    │   receipt → funds
     │   into escrow     │                     │   released to seller
     └───────────────────┴─────────────────────┘
```

#### Step-by-Step Flow

1. **Agreement** — Buyer and seller agree on terms (price, item, delivery timeline).
2. **Deposit** — Buyer sends BTC to the escrow smart contract / multisig address.
3. **Confirmation** — Escrow system confirms the deposit on the blockchain.
4. **Fulfillment** — Seller ships goods / delivers service.
5. **Release** — Buyer confirms receipt → escrow releases BTC to seller.
6. **Dispute (if needed)** — If buyer or seller disagrees, a mediator/arbiter resolves it.

### Types of Bitcoin Escrow

| Type | How It Works | Trust Level |
|------|-------------|-------------|
| **Custodial** | Third party holds the private keys. Simple but requires trust in the escrow service. | Medium |
| **2-of-3 Multisig** | Three keys created (buyer, seller, arbiter). Any 2 can release funds. No single party controls the BTC. | High |
| **Smart Contract** | Code on a blockchain (e.g., Bitcoin Script, or sidechains) automatically enforces conditions. | Highest |

### 2-of-3 Multisig — The Gold Standard

```
Keys:  🔑 Buyer  |  🔑 Seller  |  🔑 Arbiter

Happy path:   🔑 Buyer + 🔑 Seller   →  Release to seller
Dispute:      🔑 Winner + 🔑 Arbiter  →  Release to winner
```

This means:
- **No single party** can steal the funds
- **Normal transactions** don't need the arbiter at all
- **Disputes** are resolved by the arbiter signing with the winning party

---

## This Application

This project is a **full-stack Bitcoin escrow application** that demonstrates the entire flow with a modern UI. It uses a **simulated Bitcoin backend** for demonstration purposes (no real BTC involved).

### Architecture

```
┌──────────────────────────────────────────┐
│           Frontend (React)               │
│  ┌────────────┐  ┌────────────────────┐  │
│  │ Dashboard  │  │ Escrow Management  │  │
│  │ - Stats    │  │ - Create           │  │
│  │ - History  │  │ - Deposit          │  │
│  │            │  │ - Release/Dispute  │  │
│  └────────────┘  └────────────────────┘  │
└─────────────────────┬────────────────────┘
                      │ REST API
┌─────────────────────▼────────────────────┐
│           Backend (Node/Express)         │
│  ┌──────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Auth     │ │ Escrow    │ │ Dispute │ │
│  │ Service  │ │ Service   │ │ Service │ │
│  └──────────┘ └───────────┘ └─────────┘ │
│                     │                    │
│         ┌───────────▼──────────┐         │
│         │  Bitcoin Simulation  │         │
│         │  (Wallet/Multisig)   │         │
│         └──────────────────────┘         │
└──────────────────────────────────────────┘
```

### File Structure

```
bitcoin-escrow/
├── README.md                  ← You are here
├── ESCROW-EXPLAINED.md        ← Deep dive into escrow concepts
├── API-DOCS.md                ← Backend API reference
├── SETUP.md                   ← Installation & running guide
├── app.jsx                    ← Full React frontend application
└── server-reference.md        ← Backend code reference
```

---

## Quick Start

The frontend is a single-file React application that demonstrates the complete escrow flow. See [SETUP.md](./SETUP.md) for details.

---

## Security Considerations

In a production Bitcoin escrow system, you would need:

- **Real multisig wallets** using libraries like `bitcoinjs-lib`
- **Hardware security modules (HSMs)** for key storage
- **Time-locked transactions** (CLTV/CSV) for automatic refunds
- **KYC/AML compliance** depending on jurisdiction
- **Cold storage** for escrow funds
- **Audit trails** with cryptographic proofs
- **Rate limiting** and DDoS protection

---

## License

MIT — Educational purposes only. Not financial advice. Not for use with real Bitcoin without proper security auditing.
