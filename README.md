# Stellar Testnet Faucet

A modern, dark-themed faucet for sending test XLM on Stellar testnet.  
Built with Next.js App Router, shadcn/ui, Stellar SDK, and MongoDB-backed rate limiting.

## Features

- Request test XLM by connecting Freighter and submitting your wallet public key.
- Public key validation and clear API error responses.
- Per-wallet rate limiting (`RATE_LIMIT_HOURS`) stored in MongoDB.
- Faucet health endpoint for status checks.
- Minimal shadcn-based UI.

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- shadcn/ui + Tailwind CSS v4
- `@stellar/stellar-sdk`
- `@stellar/freighter-api`
- MongoDB + Mongoose

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root:

```bash
MONGODB_URI=mongodb://localhost:27017/stellar-faucet
FAUCET_SECRET_KEY=S...your_secret_key_here...
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
FAUCET_AMOUNT_XLM=100
RATE_LIMIT_HOURS=24
```

3. Install the Freighter browser extension and create/import a wallet.

4. Start MongoDB locally.

5. Run the app:

```bash
npm run dev
```

## Generate and Fund Faucet Account (Testnet)

Generate a keypair:

```bash
node -e "const {Keypair}=require('@stellar/stellar-sdk');const kp=Keypair.random();console.log('Public:',kp.publicKey(),'\nSecret:',kp.secret())"
```

Fund with Friendbot:

```bash
curl "https://friendbot.stellar.org?addr=GXXXXXXX..."
```

## API

### `GET /api/status`

Returns faucet operational status:

```json
{
  "operational": true,
  "balance": "10000.0000000",
  "amount": "100"
}
```

### `POST /api/request-xlm`

Request body:

```json
{
  "publicKey": "G..."
}
```

Success response:

```json
{
  "success": true,
  "hash": "transaction_hash",
  "amount": "100",
  "destination": "G..."
}
```

Rate-limited response (`429`):

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "nextAvailableAt": "2026-04-24T21:21:41.643Z",
  "retryAfterSeconds": 86397
}
```

## Scripts

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Security Notes

- Never commit `.env` or faucet secret keys.
- Use testnet keys only.
