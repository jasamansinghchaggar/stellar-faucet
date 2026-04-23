# Stellar Testnet Faucet - Development Roadmap

## Phase 1: Setup & Environment

### Step 1.1: Project Initialization

- [ ] Create a next app in the current directory
- [ ] Install dependencies:
  - @stellar/stellar-sdk
  - tailwindcss
  - mongoose
- [ ] Install and Setup shadcn (for UI components)

---

### Step 1.2: Generate Faucet Account

- [ ] Run keypair generation command:
  ```bash
  node -e "const {Keypair}=require('@stellar/stellar-sdk');const kp=Keypair.random();console.log('Public:',kp.publicKey(),'\nSecret:',kp.secret())"
  ```
- [ ] Save public key and secret key to a secure location (LastPass/1Password or safe file)
- [ ] Document in a private notes file (never commit)

**Acceptance Criteria:**

- Have both public and secret keys saved
- Public key format: 56 characters, starts with 'G'
- Secret key format: 56 characters, starts with 'S'

---

### Step 1.3: Fund Faucet Account via Friendbot

- [ ] Run Friendbot funding command:
  ```bash
  curl "https://friendbot.stellar.org?addr=GXXXXXXX..."
  ```
  (Replace GXXXXXXX with your public key)
- [ ] Verify response contains account creation info
- [ ] Check faucet account balance on Stellar Expert:
  - URL: `https://stellar.expert/explorer/testnet/account/GXXXXXXX...`
  - Should show 10,000 XLM

**Acceptance Criteria:**

- Friendbot request succeeds (HTTP 200)
- Account visible on Stellar Expert with 10,000 XLM balance

---

### Step 1.4: Configure Environment

- [ ] Create a `.env` file with the following variables:
  ```bash
  MONGODB_URI=mongodb://localhost:27017/stellar-faucet
  FAUCET_SECRET_KEY=S...your_secret_key_here...
  STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
  STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
  FAUCET_AMOUNT_XLM=100
  RATE_LIMIT_HOURS=24
  ```
- [ ] Verify `.env` is in `.gitignore` (never commit secrets)

**Acceptance Criteria:**

- `.env` exists with all variables filled
- `npm run dev` starts without "FAUCET_SECRET_KEY not configured" error
- Secrets are not in git history

---

## Phase 2: Backend API 

### Step 2.1: Implement Stellar Utilities (`lib/stellar.ts`)

**What this does:** Wraps Stellar SDK calls for sending XLM and checking balances

- [ ] Review `lib/stellar.ts` for these functions:
  - `sendXLM(publicKey, amount)` - sends XLM to a wallet
  - `getAccountBalance(publicKey)` - checks balance of any account
  - `getFaucetBalance()` - checks faucet's own balance
- [ ] Verify Keypair validation works:
  - Valid key: `GXXXXXXXXX...` (56 chars, starts with 'G')
  - Invalid key: should return error
- [ ] Test transaction building (no submission yet):
  - Create a transaction object
  - Sign it with faucet keypair
  - Verify no errors

**Acceptance Criteria:**

- `sendXLM()` can build and return transaction without submitting
- Public key validation rejects invalid formats
- No runtime errors in lib/stellar.ts

**Test manually:**

```bash
node -e "
import { sendXLM } from './lib/stellar';
sendXLM('GXXXXXXX...', '100').then(r => console.log(r));
"
```

---

### Step 2.2: Implement Rate Limiting (`lib/rateLimit.ts`)

**What this does:** Prevents spam by tracking requests per wallet

- [ ] Review `lib/rateLimit.ts` for:
  - `isRateLimited(key, limitHours)` - checks if wallet exceeded limit
  - `getRateLimitInfo(key)` - returns next available time
- [ ] Verify in-memory storage works:
  - First request from wallet A: not limited
  - Second request from wallet A (same 24h): should be limited
  - Request from wallet B: not limited (different wallet)
- [ ] Verify cleanup runs (old entries removed after 48h) -> make the enrty in the mongo db and check if it gets removed after 48h

**Acceptance Criteria:**

- Rate limiting correctly blocks duplicate requests
- Different wallets don't interfere with each other
- Rate limit info shows correct retry time

---

### Step 2.3: Implement Request API Endpoint (`app/api/request-xlm.ts`)

**What this does:** Handles user requests, validates input, applies rate limit, sends XLM

- [ ] Review endpoint structure:
  - Only accepts POST requests (reject GET, PUT, etc.)
  - Validates `publicKey` format
  - Checks rate limit
  - Calls `sendXLM()`
  - Returns transaction hash on success
- [ ] Test with valid public key:
  ```bash
  curl -X POST http://localhost:3000/api/request-xlm \
    -H "Content-Type: application/json" \
    -d '{"publicKey":"GXXXXXXX..."}'
  ```
- [ ] Test with invalid public key (should reject):
  ```bash
  curl -X POST http://localhost:3000/api/request-xlm \
    -H "Content-Type: application/json" \
    -d '{"publicKey":"invalid"}'
  ```
- [ ] Test rate limit (same key twice, should reject second):

  ```bash
  # First request - succeeds
  curl -X POST http://localhost:3000/api/request-xlm \
    -d '{"publicKey":"GXXXXXXX..."}'

  # Second request - rejected
  curl -X POST http://localhost:3000/api/request-xlm \
    -d '{"publicKey":"GXXXXXXX..."}'
  ```

**Acceptance Criteria:**

- Valid key returns success with tx hash
- Invalid key returns 400 error
- Duplicate request returns 429 (rate limited) error
- Error messages are helpful

---

### Step 2.4: Implement Status API Endpoint (`app/api/status.ts`)

**What this does:** Provides faucet health/balance info for monitoring and UI

- [ ] Review endpoint:
  - Only accepts GET requests
  - Returns `operational: true/false`
  - Returns faucet balance
  - Returns configured amount per request
- [ ] Test endpoint:
  ```bash
  curl http://localhost:3000/api/status
  ```
- [ ] Verify response format:
  ```json
  {
    "operational": true,
    "balance": "9900.0000000",
    "amount": "100"
  }
  ```

**Acceptance Criteria:**

- Endpoint returns 200 status
- Balance is accurate
- Response contains operational status

---

## Phase 3: Frontend UI

### Step 3.1: Analyze UI Component (`app/page.tsx`)

- [ ] Review component structure:
  - Status section (shows faucet operational status + balance)
  - Input section (public key textarea)
  - Submit button (sends request)
  - Result section (shows success/error)
  - Footer with links
- [ ] Verify styling:
  - Uses inline CSS (no external stylesheets)
  - Gradient background
  - Card layout
  - Responsive design (works on mobile)
- [ ] Check state management:
  - `publicKey` state
  - `loading` state
  - `result` state (success/error)
  - `status` state (faucet health)

**Acceptance Criteria:**

- Component renders without errors
- All sections are visible
- No console errors
- State updates correctly on user input
