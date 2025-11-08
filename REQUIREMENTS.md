# x402 Library Functions Used in Voyager-x402

This document details exactly which functions from the `/home/ametel/source/x402` library are used in the Voyager-x402 project, including file paths and line numbers.

---

## Overview

The Voyager-x402 project uses the x402 payment protocol library to enable pay-per-use API access. The integration involves both server-side (facilitator) and client-side components.

---

## 1. Server-Side: Payment Verification

### Function: `verify()`

**Used in:** `src/facilitator/verify.ts:164`

#### Main Wrapper Function
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/facilitator/facilitator.ts`
- **Lines:** 30-70
- **Purpose:** Routes verification to scheme-specific implementation based on network type

#### EVM Implementation
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts`
- **Lines:** 36-171

#### What It Does:

1. **Verifies scheme compatibility** (line 61)
   - Ensures both payload and requirements use "exact" scheme

2. **Validates network and gets chain ID** (line 74)
   - Maps network name to numeric chain ID
   - Retrieves USDC contract configuration

3. **Verifies EIP-712 typed signature** (lines 104-108)
   - Uses `client.verifyTypedData()` to validate signature
   - Confirms the signature was created by the claimed payer address
   - Validates EIP-3009 `TransferWithAuthorization` typed data

4. **Checks recipient matches** (line 118)
   - Ensures `authorization.to` matches the configured `payTo` address

5. **Verifies authorization validity window** (lines 126-144)
   - `validBefore`: Must be at least 6 seconds in the future (3 blocks padding)
   - `validAfter`: Must not be in the future

6. **Checks USDC balance** (lines 146-151)
   - Calls `getERC20Balance()` to query user's USDC balance
   - Ensures balance >= `maxAmountRequired`

7. **Verifies payment amount** (line 159)
   - Ensures `authorization.value` >= `maxAmountRequired`

#### Return Type:
```typescript
{
  isValid: boolean,
  invalidReason?: string,
  payer: string
}
```

---

## 2. Server-Side: Payment Settlement

### Function: `settle()`

**Used in:** `src/facilitator/settle.ts:142`

#### Main Wrapper Function
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/facilitator/facilitator.ts`
- **Lines:** 82-112
- **Purpose:** Routes settlement to scheme-specific implementation

#### EVM Implementation
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts`
- **Lines:** 184-241

#### What It Does:

1. **Re-verifies payment** (line 192)
   - Calls `verify()` again to ensure payment is still valid
   - Prevents race conditions or expired authorizations

2. **Parses ERC-6492 signature** (line 205)
   - Extracts the actual signature from potential ERC-6492 wrapper
   - Returns original signature if not ERC-6492 format

3. **Calls USDC contract** (lines 207-221)
   - Function: `transferWithAuthorization()`
   - Standard: EIP-3009 (Gas Abstracted Transfers)
   - Parameters:
     - `from`: Payer address
     - `to`: Recipient address (payTo)
     - `value`: Amount in USDC atomic units
     - `validAfter`: Timestamp
     - `validBefore`: Timestamp
     - `nonce`: Unique bytes32 nonce
     - `signature`: EIP-712 signature

4. **Waits for transaction receipt** (line 223)
   - Uses `wallet.waitForTransactionReceipt()`
   - Confirms transaction is mined

5. **Validates transaction status** (lines 225-232)
   - Checks `receipt.status === "success"`
   - Returns error if transaction failed

6. **Returns settlement response** (lines 235-240)

#### Return Type:
```typescript
{
  success: boolean,
  transaction: string,  // Transaction hash
  network: string,
  payer: string,
  errorReason?: string
}
```

#### USDC Contract Details:
- **Base Sepolia:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **ABI Function:** `transferWithAuthorization`
- **Gas:** Paid by facilitator (server), not the payer

---

## 3. Server-Side: Payment Middleware

### Function: `paymentMiddleware()`

**Used in:** `src/server.ts:74-78`

```typescript
app.use(
  paymentMiddleware(paymentConfig.payTo, paymentConfig.endpoints, {
    url: paymentConfig.facilitatorUrl as `${string}://${string}`,
  }),
);
```

#### Implementation
- **File:** `/home/ametel/source/x402/typescript/packages/x402-hono/src/index.ts`
- **Lines:** 75-322

#### What It Does:

1. **Compiles route patterns** (line 85)
   - Pre-processes route configuration into regex patterns
   - Extracts HTTP method restrictions

2. **Matches incoming requests** (line 89)
   - Uses `findMatchingRoute()` to check path and method
   - Returns early if route not protected

3. **Calculates atomic USDC amount** (line 107)
   - Converts dollar price (e.g., "$0.001") to atomic units
   - For USDC: `$0.001 = 1000` (6 decimals)

4. **Builds payment requirements** (lines 119-142)
   - For EVM networks (Base Sepolia):
     - Sets scheme: "exact"
     - Sets network, amount, asset (USDC address)
     - Includes EIP-712 domain configuration
     - Adds resource URL, description, timeout

5. **Handles missing payment** (lines 196-236)
   - Detects browser requests via User-Agent and Accept headers
   - Returns HTML paywall for browsers (line 226)
   - Returns JSON 402 response for API clients (lines 228-235)
   - Response includes `accepts` array with payment requirements

6. **Decodes payment header** (line 241)
   - Uses `exact.evm.decodePayment()` to parse base64 header
   - Extracts `PaymentPayload` object

7. **Finds matching requirements** (lines 256-270)
   - Compares decoded payment against expected requirements
   - Validates network and scheme match

8. **Verifies payment** (line 272)
   - Calls `verify()` function
   - Returns 402 with error if invalid (lines 274-283)

9. **Executes protected endpoint** (line 287)
   - Calls `await next()` to continue to route handler

10. **Checks response status** (lines 291-294)
    - If status >= 400, skips settlement
    - Only settles payment for successful responses

11. **Settles payment** (line 300)
    - Calls `settle()` to submit on-chain transaction
    - Throws error if settlement fails

12. **Sets response header** (line 303)
    - Adds `X-PAYMENT-RESPONSE` header
    - Contains base64-encoded settlement response with tx hash

---

## 4. Client-Side: Payment-Enabled Fetch

### Function: `wrapFetchWithPayment()`

**Used in:**
- `client/example-evm-client.ts:212`
- `tests/integration/payment-flow.test.ts:37`
- `tests/integration/basic-payment.test.ts:35`
- `tests/integration/example-evm-client.test.ts:38`

#### Implementation
- **File:** `/home/ametel/source/x402/typescript/packages/x402-fetch/src/index.ts`
- **Lines:** 55-121

#### What It Does:

1. **Makes initial fetch request** (line 63)
   - Wraps standard fetch function
   - Passes through all original parameters

2. **Returns immediately if not 402** (lines 65-67)
   - Only intercepts 402 Payment Required responses
   - All other responses pass through unchanged

3. **Parses 402 response** (lines 69-73)
   - Extracts `x402Version` and `accepts` array
   - Validates payment requirements with Zod schema

4. **Determines network** (lines 75-81)
   - For MultiNetworkSigner: tries all networks
   - For single signer: uses chain ID to determine network
   - Supports both EVM and SVM (Solana) networks

5. **Selects payment requirements** (lines 83-87)
   - Calls `selectPaymentRequirements()` to find best match
   - Filters by network and scheme compatibility

6. **Validates amount** (lines 89-91)
   - Checks `maxAmountRequired` against configured `maxValue`
   - Defaults to 0.1 USDC maximum
   - Throws error if amount too high

7. **Creates payment header** (lines 93-98)
   - Calls `createPaymentHeader()` (detailed below)
   - Returns base64-encoded payment payload

8. **Validates request init** (lines 100-106)
   - Ensures `init` parameter exists
   - Prevents infinite retry loops with `__is402Retry` flag

9. **Adds payment header** (lines 108-116)
   - Adds `X-PAYMENT` header with encoded payment
   - Adds `Access-Control-Expose-Headers` for CORS
   - Marks request as retry

10. **Retries request** (lines 118-120)
    - Makes second fetch with payment header
    - Returns final response (should be 200 with data)

---

## 5. Client-Side: Create Payment Header

### Function: `createPaymentHeader()`

**Called by:** `wrapFetchWithPayment()`

#### Implementation Chain

##### 1. Main Wrapper
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/client/createPaymentHeader.ts`
- **Lines:** 16-21
- Routes to scheme-specific implementation

##### 2. EVM Implementation
- **File:** `/home/ametel/source/x402/typescript/packages/x402/src/schemes/exact/evm/client.ts`
- **Lines:** 101-108

```typescript
export async function createPaymentHeader(
  client: SignerWallet | LocalAccount,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await createPayment(client, x402Version, paymentRequirements);
  return encodePayment(payment);
}
```

#### What It Does:

##### Step 1: `createPayment()` (lines 28-90)

1. **Generates nonce** (line 32-33)
   - Creates 32 random bytes
   - Converted to hex string

2. **Sets validity window** (lines 35-36)
   - `validAfter`: Current timestamp
   - `validBefore`: Current timestamp + 60 seconds

3. **Builds EIP-712 typed data** (lines 48-75)
   - Domain:
     - `name`: USDC token name
     - `version`: Contract version (usually "2")
     - `chainId`: Network chain ID
     - `verifyingContract`: USDC contract address
   - Message:
     - `from`: Signer address
     - `to`: Payment recipient
     - `value`: Amount in atomic units
     - `validAfter`: Timestamp
     - `validBefore`: Timestamp
     - `nonce`: Random nonce

4. **Signs typed data** (lines 76-78)
   - Uses `client.signTypedData()`
   - Creates EIP-712 signature
   - Standard: EIP-3009 TransferWithAuthorization

5. **Returns PaymentPayload** (lines 80-90)

##### Step 2: `encodePayment()` (line 107)
- Base64-encodes the `PaymentPayload` object
- Returns string suitable for `X-PAYMENT` header

---

## 6. Types and Schemas

### Core Types Used

**Source:** `/home/ametel/source/x402/typescript/packages/x402/src/types/verify/`

#### `PaymentPayload`
```typescript
{
  scheme: "exact",
  network: Network,
  x402Version: number,
  payload: ExactEvmPayload
}
```

#### `ExactEvmPayload`
```typescript
{
  authorization: {
    from: Address,
    to: Address,
    value: bigint,
    validAfter: bigint,
    validBefore: bigint,
    nonce: Hex
  },
  signature: Hex
}
```

#### `PaymentRequirements`
```typescript
{
  scheme: "exact",
  network: Network,
  maxAmountRequired: string,
  payTo: Address,
  asset: Address,  // USDC contract
  resource: string,
  description: string,
  mimeType: string,
  maxTimeoutSeconds: number,
  outputSchema?: object,
  extra?: {
    name?: string,      // Token name
    version?: string    // Contract version
  }
}
```

#### `VerifyResponse`
```typescript
{
  isValid: boolean,
  invalidReason?: string,
  payer: string
}
```

#### `SettleResponse`
```typescript
{
  success: boolean,
  transaction: string,  // Transaction hash
  network: string,
  payer: string,
  errorReason?: string
}
```

---

## Payment Flow Diagram

### Client → Server Flow

```
1. CLIENT MAKES REQUEST
   ├─> GET /api/blocks?ps=10&p=1
   └─> No X-PAYMENT header

2. SERVER RESPONDS 402
   ├─> Status: 402 Payment Required
   ├─> Body: { accepts: [...], x402Version: 1 }
   └─> Contains payment requirements

3. CLIENT CREATES PAYMENT
   ├─> wrapFetchWithPayment() intercepts 402
   ├─> createPaymentHeader() called
   │   ├─> Generates nonce
   │   ├─> Sets validity window (60s)
   │   ├─> Signs EIP-712 typed data
   │   └─> Returns base64 encoded payload
   └─> Adds X-PAYMENT header

4. CLIENT RETRIES REQUEST
   ├─> GET /api/blocks?ps=10&p=1
   ├─> Headers: { "X-PAYMENT": "<base64-payload>" }
   └─> Server receives payment

5. SERVER VERIFIES
   ├─> paymentMiddleware() decodes header
   ├─> verify() validates:
   │   ├─> Signature is valid
   │   ├─> Amount is sufficient
   │   ├─> User has balance
   │   └─> Authorization window is valid
   └─> Continues to endpoint if valid

6. SERVER EXECUTES ENDPOINT
   ├─> await next()
   └─> Route handler returns data

7. SERVER SETTLES PAYMENT
   ├─> settle() called
   ├─> Submits USDC transferWithAuthorization()
   ├─> Waits for transaction receipt
   └─> Gets transaction hash

8. SERVER RESPONDS 200
   ├─> Status: 200 OK
   ├─> Headers: { "X-PAYMENT-RESPONSE": "<settlement-info>" }
   └─> Body: API response data

9. CLIENT RECEIVES RESPONSE
   ├─> Decodes X-PAYMENT-RESPONSE header
   ├─> Extracts transaction hash
   └─> Returns API data to application
```

---

## Smart Contract Interaction

### USDC Contract (EIP-3009)

**Contract Address (Base Sepolia):** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

**Function Called:** `transferWithAuthorization`

**Location:** `/home/ametel/source/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts:207-221`

```typescript
await wallet.writeContract({
  address: paymentRequirements.asset as Address,
  abi: usdcABI,
  functionName: "transferWithAuthorization",
  args: [
    payload.authorization.from as Address,      // Payer
    payload.authorization.to as Address,        // Recipient
    BigInt(payload.authorization.value),        // Amount
    BigInt(payload.authorization.validAfter),   // Valid after timestamp
    BigInt(payload.authorization.validBefore),  // Valid before timestamp
    payload.authorization.nonce as Hex,         // Nonce
    signature,                                   // EIP-712 signature
  ],
  chain: wallet.chain as Chain,
});
```

**Key Features:**
- **Gas Abstraction:** Facilitator pays gas, not the user
- **Authorization:** User pre-signs transfer, doesn't submit transaction
- **Security:** Signature includes nonce, amount, recipient, time window
- **Standard:** EIP-3009 (Transfer With Authorization)

---

## Summary Table

| Component | Function | File | Lines | Purpose |
|-----------|----------|------|-------|---------|
| **Server** | `verify()` | `x402/src/facilitator/facilitator.ts` | 30-70 | Route to verification |
| | | `x402/src/schemes/exact/evm/facilitator.ts` | 36-171 | Verify EVM payment |
| **Server** | `settle()` | `x402/src/facilitator/facilitator.ts` | 82-112 | Route to settlement |
| | | `x402/src/schemes/exact/evm/facilitator.ts` | 184-241 | Settle EVM payment |
| **Server** | `paymentMiddleware()` | `x402-hono/src/index.ts` | 75-322 | HTTP middleware |
| **Client** | `wrapFetchWithPayment()` | `x402-fetch/src/index.ts` | 55-121 | Wrap fetch with payment |
| **Client** | `createPaymentHeader()` | `x402/src/schemes/exact/evm/client.ts` | 101-108 | Create payment |

---

## Environment Variables Referenced

The following environment variables are used to configure the x402 integration:

### Server (.env)
```bash
PAYMENT_ADDRESS=0x...        # Recipient address for payments
PRIVATE_KEY=0x...            # Server wallet to submit settlements
PAYMENT_NETWORK=base-sepolia # Network for payments
FACILITATOR_URL=http://...   # Facilitator endpoint URL
BLOCKS_PRICE=0.001          # Price in USD per request
```

### Client (.env or integration tests)
```bash
TEST_PRIVATE_KEY=0x...      # Client wallet for signing payments
API_URL=http://localhost:4022 # API server URL
```

---

## Key Standards and Specifications

1. **EIP-3009:** Transfer With Authorization
   - Allows gas-less transfers via off-chain signatures
   - Used by Circle USDC

2. **EIP-712:** Typed structured data hashing and signing
   - Used to create human-readable signatures
   - Prevents signature replay attacks

3. **EIP-6492:** Smart Account Signatures
   - Supports signatures from undeployed smart accounts
   - Parsed but typically not used in current implementation

4. **x402 Protocol:** HTTP 402 Payment Required
   - Extension of HTTP protocol for micropayments
   - Version 1 used in this implementation

---

*Generated: 2025-11-09*
*Source: /home/ametel/source/x402*
