# API Documentation — Bitcoin Escrow Backend

## Base URL

```
http://localhost:3001/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require a JWT token:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_a1b2c3",
    "username": "alice",
    "email": "alice@example.com",
    "walletBalance": 1.0
  }
}
```

#### POST `/auth/login`
Login and receive a JWT.

**Request:**
```json
{
  "email": "alice@example.com",
  "password": "securePassword123"
}
```

---

### Escrow

#### POST `/escrows`
Create a new escrow transaction.

**Request:**
```json
{
  "title": "MacBook Pro 2024",
  "description": "Used MacBook Pro M3, excellent condition",
  "amount": 0.05,
  "sellerUsername": "bob",
  "expiresInDays": 14
}
```

**Response (201):**
```json
{
  "id": "esc_x7y8z9",
  "title": "MacBook Pro 2024",
  "amount": 0.05,
  "status": "CREATED",
  "buyer": "alice",
  "seller": "bob",
  "arbiter": "system",
  "escrowAddress": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
  "createdAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-29T10:30:00Z"
}
```

#### GET `/escrows`
List all escrows for the authenticated user.

**Query params:** `?status=FUNDED&role=buyer&page=1&limit=10`

#### GET `/escrows/:id`
Get escrow details.

#### POST `/escrows/:id/fund`
Buyer deposits BTC into escrow.

**Request:**
```json
{
  "txHash": "a1b2c3d4e5f6..."
}
```

#### POST `/escrows/:id/deliver`
Seller marks the escrow as delivered.

**Request:**
```json
{
  "trackingInfo": "USPS 9400111899223033005001",
  "notes": "Shipped via USPS Priority"
}
```

#### POST `/escrows/:id/release`
Buyer confirms receipt, releasing funds to seller.

#### POST `/escrows/:id/dispute`
Either party opens a dispute.

**Request:**
```json
{
  "reason": "Item not as described",
  "evidence": "The screen has visible scratches not shown in photos"
}
```

#### POST `/escrows/:id/resolve`
Arbiter resolves a dispute.

**Request:**
```json
{
  "ruling": "BUYER",
  "splitPercentage": 100,
  "notes": "Seller misrepresented condition. Full refund to buyer."
}
```

---

### Wallet

#### GET `/wallet/balance`
Get simulated wallet balance.

#### GET `/wallet/transactions`
Get transaction history.

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ESCROW_NOT_FOUND",
    "message": "Escrow with ID esc_invalid does not exist",
    "status": 404
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `ESCROW_NOT_FOUND` | 404 | Escrow ID doesn't exist |
| `INVALID_STATE` | 400 | Action not allowed in current state |
| `INSUFFICIENT_FUNDS` | 400 | Wallet balance too low |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `VALIDATION_ERROR` | 422 | Request body validation failed |

---

## Webhooks (Production)

In production, the system would send webhooks for:

| Event | Trigger |
|-------|---------|
| `escrow.created` | New escrow created |
| `escrow.funded` | BTC deposit confirmed |
| `escrow.delivered` | Seller marks delivered |
| `escrow.released` | Funds released to seller |
| `escrow.disputed` | Dispute opened |
| `escrow.resolved` | Arbiter made a ruling |
| `escrow.expired` | Time lock expired |
