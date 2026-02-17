# Setup & Installation Guide

## Prerequisites

- Node.js 18+
- npm or yarn

## Frontend (React App)

The frontend is a single-file React application (`app.jsx`) that can be rendered directly in Claude's artifact viewer or deployed standalone.

### Running in Claude

Simply open `app.jsx` — it renders as an interactive artifact in Claude's interface.

### Running Standalone

```bash
# Create a Vite + React project
npm create vite@latest bitcoin-escrow-ui -- --template react
cd bitcoin-escrow-ui

# Copy app.jsx into src/App.jsx
cp ../app.jsx src/App.jsx

# Install dependencies
npm install lucide-react recharts

# Start dev server
npm run dev
```

## Backend (Reference Implementation)

The backend reference is in `server-reference.md`. To build a real backend:

```bash
mkdir bitcoin-escrow-api && cd bitcoin-escrow-api
npm init -y

# Core dependencies
npm install express cors jsonwebtoken bcryptjs uuid

# For real Bitcoin (production)
npm install bitcoinjs-lib tiny-secp256k1 bip39

# Dev
npm install -D nodemon
```

### Environment Variables

```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

### Running

```bash
# Development
npx nodemon server.js

# Production
node server.js
```

## Project Structure (Full Production App)

```
bitcoin-escrow/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EscrowCreate.jsx
│   │   │   ├── EscrowDetail.jsx
│   │   │   ├── DisputePanel.jsx
│   │   │   └── WalletView.jsx
│   │   ├── hooks/
│   │   │   └── useEscrow.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
├── server/                    # Express backend
│   ├── routes/
│   │   ├── auth.js
│   │   ├── escrow.js
│   │   └── wallet.js
│   ├── services/
│   │   ├── bitcoinService.js
│   │   └── escrowService.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   └── escrow.js
│   ├── server.js
│   └── package.json
│
├── docs/
│   ├── README.md
│   ├── ESCROW-EXPLAINED.md
│   ├── API-DOCS.md
│   └── SETUP.md
│
└── docker-compose.yml         # Optional containerization
```

## Testing

```bash
# Run API tests
npm test

# Test escrow flow manually
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"test123"}'
```

## Deployment

For production deployment, consider:

1. **Frontend**: Vercel, Netlify, or Cloudflare Pages
2. **Backend**: Railway, Fly.io, or AWS ECS
3. **Database**: PostgreSQL (Supabase or Neon)
4. **Bitcoin Node**: Run your own full node or use a service like BlockCypher
