# x402-starknet Implementation Plan (Paymaster-Based)

## Executive Summary

This document outlines a step-by-step incremental plan to create a Starknet-compatible x402 library. The x402 protocol enables internet-native micropayments using HTTP 402 status codes. We will implement this for Starknet using TypeScript, Bun, starknet.js, and **AVNU Paymaster** for gasless transactions.

## Project Overview

**Goal**: Create a Starknet implementation of the x402 payment protocol that maintains compatibility with the existing specification while leveraging Starknet's unique features and paymaster infrastructure for gasless payments.

**Tech Stack**:
- TypeScript (for type safety and consistency with original)
- Bun (runtime and package manager)
- starknet.js v8.7.0 (blockchain interaction)
- **AVNU Paymaster** (gasless transaction infrastructure)

**Repository**: `/home/ametel/source/x402-starknet`

## Background: x402 Protocol Architecture

The x402 protocol consists of three layers:

1. **Types Layer** - Transport and scheme-agnostic data structures
   - `PaymentRequirementsResponse` - Server payment request
   - `PaymentPayload` - Client signed payment authorization
   - `SettlementResponse` - Transaction confirmation

2. **Logic Layer** - Scheme and network-specific verification/settlement
   - "Exact" scheme: Fixed-amount transfers
   - Signature verification, balance checking, amount validation

3. **Representation Layer** - Transport-specific implementation
   - HTTP: 402 status, `X-PAYMENT` header, `X-PAYMENT-RESPONSE` header
   - MCP: Model Context Protocol for AI agents
   - A2A: Agent-to-Agent protocol

## Key Differences: EVM vs Starknet

### EVM x402 Flow (with EIP-3009)
```
1. Client signs authorization (off-chain)
2. Client sends signature to server
3. Server calls USDC.transferWithAuthorization() (1 tx)
4. Server pays gas, gets tx hash
5. Server returns resource + tx hash
```

### Starknet x402 Flow (with Paymaster)
```
1. Client builds transaction via paymaster (off-chain)
2. Client signs transaction (off-chain, no gas needed)
3. Client sends signature to server
4. Server calls paymaster.executeTransaction()
5. Paymaster relayer submits tx (paymaster pays gas in STRK)
6. Server gets tx hash, waits for confirmation
7. Server returns resource + tx hash
```

### Why Paymaster?

**Problem**: Starknet USDC doesn't have EIP-3009 or permit functionality.

**Solution**: AVNU Paymaster (SNIP-29 compliant) provides:
- ✅ Gasless transactions (clients pay nothing)
- ✅ Sponsored mode (facilitator pays all gas)
- ✅ Uses existing USDC contracts (no custom contracts needed)
- ✅ Production-ready, audited infrastructure
- ✅ Automatic relayer pool management

## Implementation Plan

---

## Phase 1: Project Setup & Foundation (Days 1-2) ✅ COMPLETE

### Step 1.1: Initialize Bun Project ✅

**Tasks**:
- [x] Create project structure
- [x] Initialize Bun project with `bun init`
- [x] Configure `package.json` with dependencies
- [x] Set up TypeScript configuration (`tsconfig.json`)
- [x] Configure linting (ESLint) and formatting (Prettier)
- [x] Set up `.gitignore`

**Deliverables**: ✅ Complete

---

### Step 1.2: Define Core Types ✅

**Tasks**:
- [x] Create `src/types/` directory
- [x] Port core x402 types from original library
- [x] Add Starknet-specific type extensions
- [x] Define network configuration types
- [x] Create Zod schemas for runtime validation

**Deliverables**: ✅ Complete

---

### Step 1.3: Network Configuration ✅

**Tasks**:
- [x] Create `src/networks/` directory
- [x] Define Starknet network configurations
- [x] Add support for mainnet, Sepolia testnet, and devnet

**Deliverables**: ✅ Complete

---

## Phase 2: Paymaster Integration Setup (Days 3-4) ✅ COMPLETE

### Step 2.1: Add Paymaster Dependencies ✅

**Tasks**:
- [x] Research AVNU Paymaster public endpoints
- [x] Add paymaster client dependencies
- [x] Configure paymaster network endpoints
- [x] Create paymaster configuration types

**Dependencies to add**:
```json
{
  "dependencies": {
    "@avnu/paymaster-rpc": "^latest", // If available as npm package
    // Or use direct HTTP client to paymaster JSON-RPC
  }
}
```

**Files to create**:
- `src/types/paymaster.ts` - Paymaster-specific types
- `src/paymaster/config.ts` - Paymaster endpoint configuration

**Paymaster Types**:
```typescript
export interface PaymasterConfig {
  /** Paymaster RPC endpoint URL */
  endpoint: string;
  /** API key for sponsored mode (optional) */
  apiKey?: string;
  /** Network identifier */
  network: StarknetNetwork;
}

export interface PaymasterFeeMode {
  /** Fee mode: sponsored (server pays) or default (user pays in token) */
  mode: 'sponsored' | 'default';
  /** Gas token address (for default mode) */
  gasToken?: string;
}

export interface PaymasterTransactionRequest {
  transaction: {
    type: 'invoke';
    invoke: {
      user_address: string;
      calls: Array<{
        to: string;
        selector: string;
        calldata: string[];
      }>;
    };
  };
  parameters: {
    version: '0x1';
    fee_mode: PaymasterFeeMode;
  };
}

export interface PaymasterBuildResponse {
  /** Typed data for client to sign */
  typedData: object;
  /** Estimated gas fees */
  estimatedFee: {
    amount: string;
    token: string;
  };
}
```

**Deliverables**: ✅ Complete
- Paymaster configuration types
- Network endpoint mapping for paymaster services

**Testing**: ✅ Type compilation

---

### Step 2.2: Paymaster Client Utilities ✅

**Tasks**:
- [x] Create paymaster client wrapper
- [x] Implement `buildTransaction` wrapper
- [x] Implement `executeTransaction` wrapper
- [x] Add error handling for paymaster responses

**Files to create**:
- `src/paymaster/client.ts` - Paymaster RPC client
- `src/paymaster/index.ts` - Public API exports

**Core Functions**:
```typescript
/**
 * Create paymaster client for network
 */
export function createPaymasterClient(
  config: PaymasterConfig
): PaymasterClient;

/**
 * Build transaction using paymaster
 */
export async function buildPaymasterTransaction(
  client: PaymasterClient,
  userAddress: string,
  calls: Call[],
  feeMode: PaymasterFeeMode
): Promise<PaymasterBuildResponse>;

/**
 * Execute transaction via paymaster
 */
export async function executePaymasterTransaction(
  client: PaymasterClient,
  signedTypedData: SignedTypedData
): Promise<{ transactionHash: string }>;
```

**Deliverables**: ✅ Complete
- Paymaster client abstraction
- Clean API for transaction building/execution

**Testing**: ✅ Unit tests with mock paymaster responses (48 tests passing)

---

## Phase 3: Payment Verification & Settlement (Days 5-7)

This phase implements the verification and settlement logic as pure library functions. These are used by applications to verify and execute payments.

### Step 3.1: Payment Verification Logic

**Tasks**:
- [ ] Implement signature verification for payment payloads
- [ ] Add balance checking before execution
- [ ] Validate payment authorization matches requirements
- [ ] Extract payer address from payload

**Files to update**:
- `src/payment/verify.ts` - Verification logic
- `src/types/index.ts` - Add signature verification types if needed

**Core Functions**:
```typescript
/**
 * Verify payment payload without executing
 *
 * Validates signature, balance, and payment parameters
 */
export async function verifyPayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  // 1. Validate payload structure with Zod
  PaymentPayloadSchema.parse(payload);

  // 2. Extract payer address from authorization
  const payer = payload.payload.authorization.from;

  // 3. Verify signature matches (starknet.js signature verification)
  const isValidSignature = verifyMessageHash(
    /* hash from typed data */,
    payload.payload.signature,
    payer
  );

  // 4. Check token balance
  const balance = await getTokenBalance(
    provider,
    paymentRequirements.asset,
    payer
  );

  // 5. Validate amount matches
  if (payload.payload.authorization.amount !== paymentRequirements.maxAmountRequired) {
    return { isValid: false, invalidReason: 'invalid_amount', payer };
  }

  return { isValid: true, payer };
}
```

**Deliverables**:
- Complete payment verification logic
- Signature verification
- Balance checking
- Payer extraction

**Testing**: Unit tests for verification logic

---

### Step 3.2: Payment Settlement Logic

**Tasks**:
- [ ] Implement settlement via paymaster
- [ ] Add transaction execution logic
- [ ] Implement transaction monitoring
- [ ] Handle settlement errors and retries

**Files to update**:
- `src/payment/settle.ts` - Settlement logic

**Core Function**:
```typescript
/**
 * Settle payment by executing via paymaster
 *
 * Verifies first, then executes the transaction
 */
export async function settlePayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  options?: { paymasterConfig?: PaymasterConfig }
): Promise<SettleResponse> {
  // 1. Verify payment first
  const verification = await verifyPayment(provider, payload, paymentRequirements);
  if (!verification.isValid) {
    return {
      success: false,
      errorReason: verification.invalidReason,
      transaction: '',
      network: paymentRequirements.network,
      payer: verification.payer,
    };
  }

  // 2. Get paymaster client and execute transaction
  const paymasterClient = createPaymasterClient(options.paymasterConfig);
  const result = await executeTransaction(
    paymasterClient,
    payload.payload.authorization.from,
    [createTransferCall(...)],
    { mode: 'sponsored' },
    [payload.payload.signature.r, payload.payload.signature.s]
  );

  // 3. Wait for confirmation
  const receipt = await waitForSettlement(provider, result.transaction_hash);

  return {
    success: true,
    transaction: result.transaction_hash,
    network: paymentRequirements.network,
    payer: verification.payer,
  };
}
```

**Deliverables**:
- Complete settlement logic
- Transaction execution via paymaster
- Transaction monitoring
- Error handling

**Testing**: Unit tests for settlement logic

---

## ~~Phase 4: Facilitator/Server Implementation~~ ❌ SKIPPED - Application Layer

**Note**: This phase is not needed for a pure library. The verification and settlement logic from Steps 4.1 and 4.2 were implemented in Phase 3 (`verifyPayment`, `settlePayment`). HTTP server implementation (Step 4.3) belongs in the application layer (voyager-x402).

---

## ~~Phase 5: Utilities & Shared Code~~ ✅ COMPLETE (Done in Phase 1)

**Note**: All utilities were already implemented in Phase 1:
- ✅ `src/utils/encoding.ts` - Base64, hex/felt conversion
- ✅ `src/utils/provider.ts` - Provider creation, retry logic
- ✅ `src/utils/token.ts` - Balance checking, metadata

---

## Phase 6: Testing Infrastructure ✅ COMPLETE

### Summary

**Completed**:
- ✅ Vitest testing framework setup
- ✅ 68 unit tests with 85%+ coverage
- ✅ Mock helpers for paymaster testing
- ✅ Comprehensive test suite for all modules

**Coverage**:
- Overall: 85.08%
- Payment module: 96.34%
- Paymaster module: 95.09%
- Utils module: 80.89%

**Note**: Integration tests with live devnet/testnet would belong in the application layer or CI/CD pipeline.

---

## ~~Phase 4 (Original): Facilitator/Server Implementation~~ (Days 8-10) - OBSOLETE

<details>
<summary>Click to view original Phase 4 plan (kept for reference)</summary>

### Step 4.1: Payment Verification

**Tasks**:
- [ ] Create `src/facilitator/` directory
- [ ] Implement payment payload validation
- [ ] Add signature verification
- [ ] Check balance before execution

**Files to create**:
- `src/facilitator/index.ts` - Main facilitator API
- `src/facilitator/verify.ts` - Verification logic

**Core Function**:
```typescript
/**
 * Verify payment payload without executing
 *
 * This validates the signed transaction is properly formed
 * and the user has sufficient balance.
 */
export async function verify(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  // 1. Validate payload structure
  PaymentPayloadSchema.parse(payload);

  // 2. Extract user address from signed typed data
  const userAddress = payload.payload.signedTypedData.user_address;

  // 3. Verify signature is valid (recover signer)
  const isValidSignature = await verifyTypedDataSignature(
    payload.payload.signedTypedData,
    payload.payload.signature,
    userAddress
  );

  if (!isValidSignature) {
    return {
      isValid: false,
      invalidReason: 'invalid_signature',
      payer: userAddress,
    };
  }

  // 4. Check token balance
  const balance = await getTokenBalance(
    provider,
    paymentRequirements.asset,
    userAddress
  );

  if (BigInt(balance) < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: 'insufficient_balance',
      payer: userAddress,
      details: { balance },
    };
  }

  // 5. Validate transaction calls match requirements
  const calls = payload.payload.signedTypedData.calls;
  const isValidTransfer = validateTransferCall(
    calls[0],
    paymentRequirements
  );

  if (!isValidTransfer) {
    return {
      isValid: false,
      invalidReason: 'invalid_amount',
      payer: userAddress,
    };
  }

  return {
    isValid: true,
    payer: userAddress,
  };
}
```

**Deliverables**:
- Verification service implementation
- Comprehensive error handling

**Testing**: Unit tests for verification logic

---

### Step 4.2: Payment Settlement (Execution via Paymaster)

**Tasks**:
- [ ] Implement payment execution via paymaster
- [ ] Handle transaction submission
- [ ] Wait for transaction confirmation
- [ ] Return transaction hash and status

**Files to create**:
- `src/facilitator/settle.ts` - Settlement logic

**Core Function**:
```typescript
/**
 * Settle payment by executing transaction via paymaster
 *
 * The facilitator's paymaster relayers pay the gas fees.
 */
export async function settle(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  // 1. Verify payment first
  const verification = await verify(provider, payload, paymentRequirements);
  if (!verification.isValid) {
    return {
      success: false,
      errorReason: verification.invalidReason,
      transaction: '',
      network: paymentRequirements.network,
      payer: verification.payer,
    };
  }

  // 2. Create paymaster client
  const paymasterClient = createPaymasterClient({
    endpoint: payload.payload.paymasterEndpoint,
    network: paymentRequirements.network,
  });

  // 3. Execute transaction via paymaster
  try {
    const result = await executePaymasterTransaction(
      paymasterClient,
      {
        typedData: payload.payload.signedTypedData,
        signature: payload.payload.signature,
      }
    );

    // 4. Wait for transaction to be accepted
    const receipt = await provider.waitForTransaction(
      result.transactionHash,
      {
        retryInterval: 2000,
        successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
      }
    );

    return {
      success: true,
      transaction: result.transactionHash,
      network: paymentRequirements.network,
      payer: verification.payer,
      status: receipt.status,
      blockNumber: receipt.block_number,
      blockHash: receipt.block_hash,
    };
  } catch (error) {
    return {
      success: false,
      errorReason: error.message,
      transaction: '',
      network: paymentRequirements.network,
      payer: verification.payer,
    };
  }
}
```

**Deliverables**:
- Settlement service implementation
- Transaction monitoring
- Error recovery

**Testing**: Integration tests on testnet with paymaster

---

### Step 4.3: HTTP Facilitator Server

**Tasks**:
- [ ] Create HTTP server for facilitator endpoints
- [ ] Implement `/verify` endpoint
- [ ] Implement `/settle` endpoint
- [ ] Implement `/supported` endpoint
- [ ] Add error handling and logging

**Files to create**:
- `src/facilitator/server.ts` - HTTP server implementation

**Endpoints**:
```typescript
// POST /verify
interface VerifyRequest {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

// POST /settle
interface SettleRequest {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

// GET /supported
interface SupportedResponse {
  kinds: Array<{
    scheme: 'exact';
    network: StarknetNetwork;
    paymasterEndpoint: string;
  }>;
}
```

**Server Example**:
```typescript
import { serve } from 'bun';

const server = serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/verify' && req.method === 'POST') {
      const body = await req.json() as VerifyRequest;
      const result = await verify(provider, body.paymentPayload, body.paymentRequirements);
      return Response.json(result);
    }

    if (url.pathname === '/settle' && req.method === 'POST') {
      const body = await req.json() as SettleRequest;
      const result = await settle(provider, body.paymentPayload, body.paymentRequirements);
      return Response.json(result);
    }

    // ... more endpoints
  },
});
```

**Deliverables**:
- Working HTTP facilitator server
- API documentation

**Testing**: Integration tests for HTTP endpoints

</details>

---

## ~~Phase 5 (Original): Utilities & Shared Code~~ (Days 11-12) - OBSOLETE

<details>
<summary>Click to view original Phase 5 plan (kept for reference)</summary>

### Step 5.1: Encoding & Serialization

**Tasks**:
- [ ] Create `src/utils/` directory
- [ ] Implement base64 encoding/decoding
- [ ] Add JSON serialization utilities
- [ ] Create hex/felt conversion utilities

**Files to create**:
- `src/utils/encoding.ts` - Encoding utilities
- `src/utils/serialization.ts` - JSON utilities
- `src/utils/starknet.ts` - Starknet-specific utilities

**Utility Functions**:
```typescript
export function encodePaymentPayload(payload: PaymentPayload): string;
export function decodePaymentPayload(encoded: string): PaymentPayload;
export function hexToFelt(hex: string): string;
export function feltToHex(felt: string): string;
```

**Deliverables**:
- Complete utility library
- JSDoc documentation

**Testing**: Unit tests for all utilities

---

### Step 5.2: Provider Management

**Tasks**:
- [ ] Create provider factory
- [ ] Implement connection management
- [ ] Add retry logic for RPC calls

**Files to create**:
- `src/utils/provider.ts` - Provider utilities

**Provider Functions**:
```typescript
export function createProvider(network: StarknetNetwork): RpcProvider;
export function getNetworkFromChainId(chainId: string): StarknetNetwork;
export async function retryRpcCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T>;
```

**Deliverables**:
- Provider management utilities

**Testing**: Integration tests with real RPC

---

### Step 5.3: Token Balance Utilities

**Tasks**:
- [ ] Implement token balance checking
- [ ] Create ERC20 call utilities
- [ ] Add token metadata fetching

**Files to create**:
- `src/utils/token.ts` - Token utilities

**Token Functions**:
```typescript
/** Get ERC20 token balance */
export async function getTokenBalance(
  provider: RpcProvider,
  tokenAddress: string,
  accountAddress: string
): Promise<string>;

/** Get token metadata (name, symbol, decimals) */
export async function getTokenMetadata(
  provider: RpcProvider,
  tokenAddress: string
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
}>;
```

**Deliverables**:
- Token interaction utilities

**Testing**: Integration tests on testnet

</details>

---

## ~~Phase 6 (Original): Testing Infrastructure~~ (Days 13-14) - OBSOLETE

<details>
<summary>Click to view original Phase 6 plan (kept for reference)</summary>

### Step 6.1: Unit Tests

**Tasks**:
- [ ] Set up Vitest testing framework
- [ ] Write unit tests for all utilities
- [ ] Write unit tests for client functions
- [ ] Write unit tests for facilitator logic
- [ ] Achieve >80% code coverage

**Testing Structure**:
```
tests/
├── unit/
│   ├── types.test.ts
│   ├── client.test.ts
│   ├── facilitator.test.ts
│   ├── paymaster.test.ts
│   └── utils/
│       ├── encoding.test.ts
│       ├── token.test.ts
│       └── provider.test.ts
```

**Deliverables**:
- Comprehensive unit test suite
- Code coverage reports

---

### Step 6.2: Integration Tests

**Tasks**:
- [ ] Set up Starknet devnet
- [ ] Write integration tests for payment flow
- [ ] Test with mock paymaster (or testnet paymaster)
- [ ] Test wallet integration
- [ ] Test facilitator HTTP endpoints

**Testing Structure**:
```
tests/
├── integration/
│   ├── payment-flow.test.ts
│   ├── paymaster.test.ts
│   ├── facilitator.test.ts
│   └── wallet.test.ts
```

**Deliverables**:
- Integration test suite
- Devnet setup documentation

**Testing**: End-to-end payment flows

</details>

---

## Phase 7: Documentation (Library-Focused)

This phase focuses on documentation relevant to a pure library. Example applications belong in voyager-x402 or separate example repos.

### Step 7.1: API Documentation

**Tasks**:
- [ ] Update comprehensive README
- [ ] Document all public APIs with JSDoc
- [ ] Create API reference documentation
- [ ] Add usage examples for each function

**Documentation Files**:
- `README.md` - Main project documentation (update)
- `docs/API.md` - Complete API reference
- `docs/ARCHITECTURE.md` - System architecture
- `docs/PAYMASTER.md` - Paymaster integration guide

**Deliverables**:
- Complete documentation set
- Code examples throughout

---

### Step 7.2: Example Applications

**Tasks**:
- [ ] Create `examples/` directory
- [ ] Build simple payment client example (browser)
- [ ] Build client example (Node.js/Bun)
- [ ] Build facilitator server example
- [ ] Create AI agent payment example

**Example Structure**:
```
examples/
├── client/
│   ├── browser/
│   │   ├── index.html
│   │   └── app.ts
│   └── node/
│       └── client.ts
├── server/
│   └── facilitator.ts
└── agent/
    └── ai-agent-payment.ts
```

**Deliverables**:
- Working example applications
- Example-specific documentation

---

### Step 7.3: Migration Guide

**Tasks**:
- [ ] Create migration guide from EVM x402 to Starknet x402
- [ ] Document differences (paymaster vs EIP-3009)
- [ ] Provide code comparison examples

**Files to create**:
- `docs/MIGRATION.md` - Migration guide

**Deliverables**:
- Migration documentation
- Side-by-side code comparisons

---

## Phase 8: Package & Distribution (Days 17-18)

### Step 8.1: Package Configuration

**Tasks**:
- [ ] Update package.json for npm publication
- [ ] Set up build scripts with Bun
- [ ] Create type definition files (`.d.ts`)
- [ ] Configure exports for different module systems

**Package.json Updates**:
```json
{
  "name": "@x402/starknet",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client/index.js",
    "./facilitator": "./dist/facilitator/index.js",
    "./paymaster": "./dist/paymaster/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

**Deliverables**:
- Production-ready package configuration

---

### Step 8.2: Build & Bundle

**Tasks**:
- [ ] Set up bundling with Bun
- [ ] Generate type definitions
- [ ] Optimize bundle size
- [ ] Test package installation

**Deliverables**:
- Bundled library
- Type definitions

---

### Step 8.3: CI/CD Pipeline

**Tasks**:
- [ ] Set up GitHub Actions
- [ ] Configure automated testing
- [ ] Set up automated publishing
- [ ] Add code quality checks

**Deliverables**:
- Automated CI/CD pipeline

---

## Phase 9: Advanced Features (Days 19-20)

### Step 9.1: Batch Payments

**Tasks**:
- [ ] Add support for multiple payments in single transaction
- [ ] Implement client-side batch API

**Deliverables**:
- Batch payment support

---

### Step 9.2: Fee Estimation

**Tasks**:
- [ ] Implement gas estimation
- [ ] Add fee preview for users
- [ ] Support gasless vs paid modes

**Deliverables**:
- Fee estimation utilities

---

## Phase 10: Production Readiness (Days 21-22)

### Step 10.1: Security Review

**Tasks**:
- [ ] Review all code for security issues
- [ ] Document security assumptions
- [ ] Create security testing checklist

**Deliverables**:
- Security documentation

---

### Step 10.2: Performance Testing

**Tasks**:
- [ ] Benchmark client operations
- [ ] Benchmark facilitator throughput
- [ ] Test under load

**Deliverables**:
- Performance benchmarks

---

### Step 10.3: Production Deployment Guide

**Tasks**:
- [ ] Document paymaster service selection
- [ ] Create deployment checklist
- [ ] Set up monitoring

**Deliverables**:
- Production deployment guide

---

## Project Structure

Final project structure:
```
x402-starknet/
├── src/
│   ├── types/             # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── payment.ts
│   │   ├── network.ts
│   │   ├── settlement.ts
│   │   ├── paymaster.ts   # NEW: Paymaster types
│   │   └── schemas.ts
│   ├── networks/          # Network configurations
│   │   ├── index.ts
│   │   └── constants.ts
│   ├── paymaster/         # NEW: Paymaster integration
│   │   ├── index.ts
│   │   ├── client.ts
│   │   └── config.ts
│   ├── client/            # Client-side API
│   │   ├── index.ts
│   │   ├── builder.ts     # Transaction building
│   │   ├── header.ts
│   │   ├── selector.ts
│   │   └── wallet.ts
│   ├── facilitator/       # Facilitator API
│   │   ├── index.ts
│   │   ├── verify.ts
│   │   ├── settle.ts
│   │   └── server.ts
│   ├── utils/             # Utilities
│   │   ├── encoding.ts
│   │   ├── serialization.ts
│   │   ├── starknet.ts
│   │   ├── provider.ts
│   │   └── token.ts       # NEW: Token utilities
│   └── index.ts           # Main entry point
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── examples/              # Example applications
│   ├── client/
│   ├── server/
│   └── agent/
├── docs/                  # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── PAYMASTER.md       # NEW: Paymaster guide
│   └── MIGRATION.md
├── .github/workflows/
│   └── ci.yml
├── package.json
├── tsconfig.json
├── README.md
└── IMPLEMENTATION_PLAN.md
```

## Dependencies

### Core Dependencies
- `starknet`: ^8.7.0 - Starknet.js library
- `@scure/base`: ^1.1.10 - Encoding utilities
- `zod`: ^3.24.2 - Runtime validation
- **Paymaster client** (HTTP fetch to JSON-RPC or npm package if available)

### Development Dependencies
- `@types/bun`: latest
- `typescript`: ^5.7.0
- `vitest`: ^3.0.0
- `eslint`: ^9.0.0
- `prettier`: ^3.4.0

## Success Criteria

### Functional Requirements
- [ ] Clients can create gasless payment transactions
- [ ] Servers can verify payments before execution
- [ ] Facilitators can settle payments via paymaster
- [ ] Full compatibility with x402 protocol specification
- [ ] Support for Starknet mainnet and testnet

### Non-Functional Requirements
- [ ] >80% code coverage
- [ ] Type-safe TypeScript implementation
- [ ] Comprehensive documentation
- [ ] Working examples for all use cases
- [ ] Zero gas cost for clients (paymaster-sponsored)

## Timeline

**Total Duration**: 22 days (reduced from 25)

- **Phase 1**: 2 days - Foundation ✅ COMPLETE
- **Phase 2**: 2 days - Paymaster Integration
- **Phase 3**: 3 days - Client Implementation
- **Phase 4**: 3 days - Facilitator Implementation
- **Phase 5**: 2 days - Utilities
- **Phase 6**: 2 days - Testing
- **Phase 7**: 2 days - Documentation
- **Phase 8**: 2 days - Package & Distribution
- **Phase 9**: 2 days - Advanced Features
- **Phase 10**: 2 days - Production Readiness

## Key Advantages of Paymaster Approach

1. **No Custom Contracts** - Uses existing USDC contracts
2. **True Gasless UX** - Clients pay zero gas fees
3. **Production Ready** - AVNU Paymaster is audited and battle-tested
4. **Standard Compliance** - SNIP-29 compliant
5. **Simple Integration** - Just HTTP JSON-RPC calls
6. **Flexible Modes** - Support both sponsored and user-paid-in-token modes

## Paymaster Service Options

### Option A: Public Paymaster Services
- Use existing AVNU Paymaster endpoints
- No infrastructure to maintain
- May have rate limits or fees

### Option B: Self-Hosted Paymaster
- Deploy own AVNU Paymaster instance
- Full control over sponsorship rules
- Requires infrastructure management
- Reference: `/home/ametel/source/paymaster`

**For x402, we recommend Option A (public services) for simplicity.**

## Next Steps

1. ✅ Phase 1 Complete
2. **Start Phase 2**: Research and configure paymaster endpoints
3. Implement client transaction building
4. Build facilitator settlement logic

---

## References

- x402 Specification: `/home/ametel/source/x402/specs/x402-specification.md`
- Original x402 Implementation: `/home/ametel/source/x402`
- Starknet.js Documentation: `/home/ametel/source/starknet.js`
- AVNU Paymaster: `/home/ametel/source/paymaster`
- Starknet Documentation: https://docs.starknet.io

---

**Document Version**: 2.0 (Paymaster-Based)
**Last Updated**: 2025-11-09
**Author**: Claude Code
**Status**: Ready for Implementation
