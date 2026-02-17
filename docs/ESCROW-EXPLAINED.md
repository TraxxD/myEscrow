# Bitcoin Escrow — Deep Dive

## The Trust Problem in Digital Commerce

When two strangers transact online, there's an asymmetry of information and power. Traditional finance solves this through intermediaries (banks, PayPal, credit card companies) who can reverse transactions. Bitcoin, by design, has **no chargebacks** — transactions are final. This makes escrow essential.

## How Bitcoin Multisig Works

### P2SH (Pay-to-Script-Hash)

Bitcoin's scripting language supports multisignature transactions natively. A 2-of-3 multisig address is created from three public keys:

```
OP_2 <PubKey_Buyer> <PubKey_Seller> <PubKey_Arbiter> OP_3 OP_CHECKMULTISIG
```

This script says: "To spend from this address, provide signatures from any 2 of these 3 keys."

### Key Generation Flow

```
Buyer generates:    Private Key A  →  Public Key A
Seller generates:   Private Key B  →  Public Key B
Arbiter generates:  Private Key C  →  Public Key C

Combined:  multisig(2, PubKeyA, PubKeyB, PubKeyC)  →  Escrow Address (3xxxx...)
```

Each party keeps their private key secret. The escrow address is derived from all three public keys, but no single party can spend from it alone.

## Escrow Lifecycle

### State Machine

```
                    ┌──────────┐
                    │ CREATED  │
                    └────┬─────┘
                         │ buyer deposits BTC
                    ┌────▼─────┐
                    │ FUNDED   │
                    └────┬─────┘
                         │ seller ships / delivers
                    ┌────▼──────┐
              ┌─────│ DELIVERED │─────┐
              │     └───────────┘     │
              │ buyer confirms        │ buyer disputes
         ┌────▼─────┐          ┌─────▼──────┐
         │ RELEASED │          │  DISPUTED  │
         └──────────┘          └─────┬──────┘
                                     │ arbiter decides
                               ┌─────▼──────┐
                               │  RESOLVED  │
                               └────────────┘
```

### State Descriptions

| State | Description | Who Can Act |
|-------|-------------|-------------|
| **CREATED** | Escrow terms agreed upon, awaiting deposit | Buyer |
| **FUNDED** | BTC deposited and confirmed on-chain | Seller |
| **DELIVERED** | Seller marks as delivered/shipped | Buyer |
| **RELEASED** | Buyer confirms, funds sent to seller | — (final) |
| **DISPUTED** | Buyer raised a dispute | Arbiter |
| **RESOLVED** | Arbiter ruled, funds distributed | — (final) |
| **EXPIRED** | Time lock expired, auto-refund to buyer | — (final) |

## Time Locks

Bitcoin supports two types of time locks that are crucial for escrow:

**CLTV (CheckLockTimeVerify)** — Funds cannot be spent until a specific block height or timestamp. Used for auto-refunds if the seller never delivers.

**CSV (CheckSequenceVerify)** — Funds cannot be spent until a certain number of blocks have passed since the transaction was confirmed. Used for cooling-off periods.

```
Example: 30-day escrow with auto-refund

Day 0:   Buyer deposits to multisig
Day 1-30: Normal escrow flow (2-of-3 multisig)
Day 30+:  If no resolution, buyer can unilaterally
          reclaim funds using CLTV path
```

## Fee Structure

Typical Bitcoin escrow services charge:

- **Escrow fee**: 0.5% – 2% of the transaction amount
- **Network fee**: Bitcoin mining fee (variable, paid by the depositor)
- **Dispute fee**: Additional 1% – 3% if arbitration is needed

## Real-World Use Cases

- **Peer-to-peer trading** (LocalBitcoins model)
- **Freelance payments** (milestone-based releases)
- **Domain name sales**
- **High-value goods** (cars, electronics, collectibles)
- **Cross-border trade** where banking is unreliable
- **NFT / digital asset sales**

## Security Best Practices

1. **Never reuse escrow addresses** — Generate a fresh multisig for each transaction
2. **Verify addresses on multiple devices** — Prevent clipboard malware
3. **Use hardware wallets** for arbiter keys
4. **Implement rate limiting** on the API
5. **Require email/2FA verification** before releasing funds
6. **Log everything** with tamper-proof audit trails
7. **Set reasonable time limits** — Escrows shouldn't be open-ended
