# x402-starknet Implementation Plan

## Executive Summary

This document outlines a step-by-step incremental plan to create a Starknet-compatible x402 library. The x402 protocol enables internet-native micropayments using HTTP 402 status codes. We will port the existing EVM/Solana implementation to Starknet using TypeScript, Bun, and starknet.js.

## Project Overview

**Goal**: Create a Starknet implementation of the x402 payment protocol that maintains compatibility with the existing specification while adapting to Starknet's unique architecture.

**Tech Stack**:
- TypeScript (for type safety and consistency with original)
- Bun (runtime and package manager)
- starknet.js v8.7.0 (blockchain interaction)
- Cairo contracts (on-chain payment verification)

**Repository**: `/home/ametel/source/x402-starknet`

## Background: x402 Protocol Architecture

The x402 protocol consists of three layers:

1. **Types Layer** - Transport and scheme-agnostic data structures
   - `PaymentRequirementsResponse` - Server payment request
   - `PaymentPayload` - Client signed payment authorization
   - `SettlementResponse` - Transaction confirmation

2. **Logic Layer** - Scheme and network-specific verification/settlement
   - "Exact" scheme: Fixed-amount transfers using EIP-3009 (EVM) or TransferChecked (Solana)
   - Signature verification, balance checking, amount validation

3. **Representation Layer** - Transport-specific implementation
   - HTTP: 402 status, `X-PAYMENT` header, `X-PAYMENT-RESPONSE` header
   - MCP: Model Context Protocol for AI agents
   - A2A: Agent-to-Agent protocol

## Key Differences: EVM/Solana vs Starknet

### Challenges to Address

1. **No EIP-3009 on Starknet**: Starknet doesn't support EIP-3009's `transferWithAuthorization`. We need to design a Cairo contract equivalent.

2. **Different Signature Scheme**:
   - EVM uses ECDSA secp256k1 with EIP-712
   - Starknet uses STARK-friendly curves (ECDSA over Stark curve) with structured hashing

3. **Account Abstraction**:
   - Starknet has native Account Abstraction (all accounts are smart contracts)
   - Need to support both standard accounts and custom account contracts

4. **Transaction Structure**:
   - Different nonce management
   - Different gas model (steps vs gas)
   - No mempool (transactions go directly to sequencer)

5. **Token Standards**:
   - No USDC with EIP-3009 on Starknet
   - Need to work with ERC20-like tokens or create custom payment tokens

## Implementation Plan

---

## Phase 1: Project Setup & Foundation (Days 1-2)

### Step 1.1: Initialize Bun Project

**Tasks**:
- [x] Create project structure
- [ ] Initialize Bun project with `bun init`
- [ ] Configure `package.json` with dependencies
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure linting (ESLint) and formatting (Prettier)
- [ ] Set up `.gitignore`

**Deliverables**:
- Working Bun project with TypeScript
- Development tooling configured

**Dependencies to install**:
```json
{
  "dependencies": {
    "starknet": "^8.7.0",
    "@scure/base": "^1.1.10",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.4.0",
    "vitest": "^3.0.0"
  }
}
```

**Testing**: Verify Bun installation and TypeScript compilation

---

### Step 1.2: Define Core Types

**Tasks**:
- [ ] Create `src/types/` directory
- [ ] Port core x402 types from original library
- [ ] Add Starknet-specific type extensions
- [ ] Define network configuration types
- [ ] Create Zod schemas for runtime validation

**Files to create**:
- `src/types/index.ts` - Export all types
- `src/types/payment.ts` - Payment requirements and payloads
- `src/types/network.ts` - Starknet network configurations
- `src/types/settlement.ts` - Settlement and verification responses
- `src/types/schemas.ts` - Zod validation schemas

**Key Types**:
```typescript
// Starknet network configuration
export type StarknetNetwork =
  | "starknet-mainnet"
  | "starknet-sepolia"
  | "starknet-devnet";

// Payment requirements (Starknet-specific)
export interface StarknetPaymentRequirements {
  scheme: "exact"; // Start with exact scheme
  network: StarknetNetwork;
  maxAmountRequired: string; // u256 as string
  asset: string; // Token contract address (felt)
  payTo: string; // Recipient address (felt)
  resource: string; // Protected resource URL
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  extra?: {
    tokenName?: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
  };
}

// Payment payload (client creates)
export interface StarknetPaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: StarknetNetwork;
  payload: {
    signature: {
      r: string; // Signature component (felt)
      s: string; // Signature component (felt)
    };
    authorization: {
      from: string; // Payer address (felt)
      to: string; // Recipient address (felt)
      amount: string; // Payment amount (u256 as string)
      token: string; // Token contract address (felt)
      nonce: string; // Replay protection (felt)
      validUntil: string; // Expiry timestamp (u64)
    };
  };
}
```

**Deliverables**:
- Complete type definitions in `src/types/`
- Runtime validation schemas
- JSDoc documentation for all types

**Testing**: Type compilation, Zod schema validation tests

---

### Step 1.3: Network Configuration

**Tasks**:
- [ ] Create `src/networks/` directory
- [ ] Define Starknet network configurations (RPC URLs, chain IDs)
- [ ] Add support for mainnet, Sepolia testnet, and devnet
- [ ] Create network utility functions

**Files to create**:
- `src/networks/index.ts` - Network configurations and utilities
- `src/networks/constants.ts` - Network constants

**Network Configurations**:
```typescript
export const STARKNET_NETWORKS = {
  "starknet-mainnet": {
    chainId: "0x534e5f4d41494e", // SN_MAIN
    rpcUrl: "https://starknet-mainnet.public.blastapi.io",
    explorerUrl: "https://starkscan.co",
  },
  "starknet-sepolia": {
    chainId: "0x534e5f5345504f4c4941", // SN_SEPOLIA
    rpcUrl: "https://starknet-sepolia.public.blastapi.io",
    explorerUrl: "https://sepolia.starkscan.co",
  },
  "starknet-devnet": {
    chainId: "0x534e5f474f45524c49", // SN_GOERLI (for devnet)
    rpcUrl: "http://localhost:5050",
    explorerUrl: null,
  },
} as const;
```

**Deliverables**:
- Network configuration module
- Helper functions for network selection

**Testing**: Network configuration retrieval

---

## Phase 2: Cairo Smart Contracts (Days 3-5)

### Step 2.1: Design Payment Authorization Contract

**Tasks**:
- [ ] Create `contracts/` directory
- [ ] Design Cairo contract interface for payment authorization
- [ ] Implement signature verification using Starknet's account abstraction
- [ ] Add nonce management for replay protection
- [ ] Implement expiry validation

**Contract Design**: `PaymentAuthorization.cairo`

**Key Functions**:
```cairo
// Verify payment authorization without executing
#[external(v0)]
fn verify_payment(
    ref self: ContractState,
    payer: ContractAddress,
    recipient: ContractAddress,
    token: ContractAddress,
    amount: u256,
    nonce: felt252,
    valid_until: u64,
    signature: Signature
) -> bool;

// Execute payment with authorization
#[external(v0)]
fn execute_payment(
    ref self: ContractState,
    payer: ContractAddress,
    recipient: ContractAddress,
    token: ContractAddress,
    amount: u256,
    nonce: felt252,
    valid_until: u64,
    signature: Signature
);

// Check if nonce has been used
#[external(v0)]
fn is_nonce_used(self: @ContractState, payer: ContractAddress, nonce: felt252) -> bool;
```

**Deliverables**:
- Cairo contract implementation
- Comprehensive comments and documentation

**Testing**: Unit tests for contract logic (later in Phase 4)

---

### Step 2.2: Token Transfer Logic

**Tasks**:
- [ ] Implement ERC20 token transfer within payment contract
- [ ] Add balance verification
- [ ] Handle transfer failures gracefully
- [ ] Emit payment events

**Contract Events**:
```cairo
#[event]
fn PaymentExecuted(
    payer: ContractAddress,
    recipient: ContractAddress,
    token: ContractAddress,
    amount: u256,
    nonce: felt252
);

#[event]
fn PaymentVerified(
    payer: ContractAddress,
    recipient: ContractAddress,
    amount: u256
);
```

**Deliverables**:
- Token transfer implementation
- Event emission

---

### Step 2.3: Deploy Contracts to Networks

**Tasks**:
- [ ] Set up deployment scripts using starknet.js
- [ ] Deploy to Sepolia testnet first
- [ ] Deploy to devnet for local testing
- [ ] Create deployment documentation

**Files to create**:
- `scripts/deploy.ts` - Deployment script
- `contracts/deployments.json` - Deployed contract addresses

**Deliverables**:
- Deployed contracts on testnet and devnet
- Contract addresses documented

---

## Phase 3: Client-Side Implementation (Days 6-8)

### Step 3.1: Payment Header Creation

**Tasks**:
- [ ] Create `src/client/` directory
- [ ] Implement payment payload signing using starknet.js
- [ ] Create structured hash for authorization (similar to EIP-712)
- [ ] Implement payment header formatting

**Files to create**:
- `src/client/index.ts` - Main client API
- `src/client/signer.ts` - Signature creation
- `src/client/header.ts` - Header formatting

**Core Function**:
```typescript
export async function createPaymentHeader(
  account: Account | Signer,
  x402Version: number,
  paymentRequirements: StarknetPaymentRequirements
): Promise<string> {
  // 1. Generate nonce
  // 2. Create authorization payload
  // 3. Hash payload using Starknet's structured hash
  // 4. Sign hash with account/signer
  // 5. Format as base64-encoded JSON
}
```

**Deliverables**:
- Client payment creation API
- Signature generation and verification

**Testing**: Unit tests for signature creation

---

### Step 3.2: Payment Requirements Selection

**Tasks**:
- [ ] Implement payment requirements selector
- [ ] Add network compatibility checks
- [ ] Create wallet/account validation

**Files to create**:
- `src/client/selector.ts` - Requirements selection logic

**Core Function**:
```typescript
export async function selectPaymentRequirements(
  requirements: StarknetPaymentRequirements[],
  account: Account
): Promise<StarknetPaymentRequirements> {
  // 1. Filter by network compatibility
  // 2. Check token balance
  // 3. Verify account can sign
  // 4. Return best match or throw error
}
```

**Deliverables**:
- Automatic payment requirements selection
- Balance and compatibility checks

**Testing**: Unit tests for selection logic

---

### Step 3.3: Wallet Integration

**Tasks**:
- [ ] Add support for different Starknet wallets
- [ ] Integrate with starknet.js `Account` interface
- [ ] Support both Browser wallets (ArgentX, Braavos) and Server wallets (local signers)

**Files to create**:
- `src/client/wallet.ts` - Wallet abstraction

**Wallet Types to Support**:
```typescript
// Browser wallet (via get-starknet)
export async function connectBrowserWallet(): Promise<Account>;

// Local signer (for servers/agents)
export function createLocalAccount(
  provider: RpcProvider,
  privateKey: string,
  accountAddress: string
): Account;
```

**Deliverables**:
- Multi-wallet support
- Unified account interface

**Testing**: Integration tests with different wallet types

---

## Phase 4: Facilitator Implementation (Days 9-11)

### Step 4.1: Verification Service

**Tasks**:
- [ ] Create `src/facilitator/` directory
- [ ] Implement payment verification logic
- [ ] Add signature verification using starknet.js
- [ ] Check balance, nonce, and expiry

**Files to create**:
- `src/facilitator/index.ts` - Main facilitator API
- `src/facilitator/verify.ts` - Verification logic

**Core Function**:
```typescript
export async function verify(
  provider: RpcProvider,
  contractAddress: string,
  payload: StarknetPaymentPayload,
  paymentRequirements: StarknetPaymentRequirements
): Promise<VerifyResponse> {
  // 1. Validate payload structure
  // 2. Check signature validity
  // 3. Verify token balance
  // 4. Check nonce not used
  // 5. Verify not expired
  // 6. Return verification result
}
```

**Response Type**:
```typescript
export interface VerifyResponse {
  isValid: boolean;
  invalidReason?:
    | "invalid_signature"
    | "insufficient_balance"
    | "nonce_used"
    | "expired"
    | "invalid_network"
    | "invalid_amount";
  payer: string;
}
```

**Deliverables**:
- Verification service implementation
- Comprehensive error handling

**Testing**: Unit tests for verification logic

---

### Step 4.2: Settlement Service

**Tasks**:
- [ ] Implement payment settlement (transaction execution)
- [ ] Call Cairo contract's `execute_payment` function
- [ ] Handle transaction submission and confirmation
- [ ] Return transaction hash and status

**Files to create**:
- `src/facilitator/settle.ts` - Settlement logic

**Core Function**:
```typescript
export async function settle(
  account: Account,
  contractAddress: string,
  payload: StarknetPaymentPayload,
  paymentRequirements: StarknetPaymentRequirements
): Promise<SettleResponse> {
  // 1. Verify payment first
  // 2. Prepare contract call
  // 3. Execute transaction
  // 4. Wait for acceptance
  // 5. Return transaction details
}
```

**Response Type**:
```typescript
export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  transaction: string; // Transaction hash
  network: StarknetNetwork;
  payer: string;
}
```

**Deliverables**:
- Settlement service implementation
- Transaction monitoring

**Testing**: Integration tests on testnet

---

### Step 4.3: HTTP Facilitator Server

**Tasks**:
- [ ] Create HTTP server for facilitator endpoints
- [ ] Implement `/verify` endpoint
- [ ] Implement `/settle` endpoint
- [ ] Implement `/supported` endpoint for discovery
- [ ] Add error handling and logging

**Files to create**:
- `src/facilitator/server.ts` - HTTP server implementation

**Endpoints**:
```typescript
// POST /verify
interface VerifyRequest {
  paymentPayload: StarknetPaymentPayload;
  paymentRequirements: StarknetPaymentRequirements;
}

// POST /settle
interface SettleRequest {
  paymentPayload: StarknetPaymentPayload;
  paymentRequirements: StarknetPaymentRequirements;
}

// GET /supported
interface SupportedResponse {
  kinds: Array<{
    scheme: "exact";
    network: StarknetNetwork;
  }>;
}
```

**Deliverables**:
- Working HTTP facilitator server
- API documentation

**Testing**: Integration tests for HTTP endpoints

---

## Phase 5: Utilities & Shared Code (Days 12-13)

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
// Encode payment payload to base64
export function encodePaymentPayload(payload: StarknetPaymentPayload): string;

// Decode payment payload from base64
export function decodePaymentPayload(encoded: string): StarknetPaymentPayload;

// Convert hex to felt252
export function hexToFelt(hex: string): string;

// Convert felt252 to hex
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
- [ ] Create provider utilities

**Files to create**:
- `src/utils/provider.ts` - Provider utilities

**Provider Functions**:
```typescript
// Create provider for network
export function createProvider(network: StarknetNetwork): RpcProvider;

// Get network from chain ID
export function getNetworkFromChainId(chainId: string): StarknetNetwork;

// Retry RPC call with exponential backoff
export async function retryRpcCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T>;
```

**Deliverables**:
- Provider management utilities
- Connection pooling (if needed)

**Testing**: Integration tests with real RPC

---

### Step 5.3: Hashing & Cryptography

**Tasks**:
- [ ] Implement structured hash (Starknet equivalent of EIP-712)
- [ ] Create authorization hash function
- [ ] Add signature verification utilities

**Files to create**:
- `src/utils/hash.ts` - Hashing utilities
- `src/utils/crypto.ts` - Cryptography utilities

**Hash Functions**:
```typescript
// Create authorization hash for signing
export function hashAuthorization(
  from: string,
  to: string,
  amount: string,
  token: string,
  nonce: string,
  validUntil: string,
  chainId: string
): string;

// Verify signature
export function verifySignature(
  hash: string,
  signature: { r: string; s: string },
  publicKey: string
): boolean;
```

**Deliverables**:
- Hashing and crypto utilities
- Signature verification

**Testing**: Unit tests for hash and signature functions

---

## Phase 6: Testing Infrastructure (Days 14-15)

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
│   ├── utils/
│   │   ├── encoding.test.ts
│   │   ├── hash.test.ts
│   │   └── provider.test.ts
```

**Deliverables**:
- Comprehensive unit test suite
- Code coverage reports

---

### Step 6.2: Integration Tests

**Tasks**:
- [ ] Set up local Starknet devnet
- [ ] Write integration tests for contract interaction
- [ ] Write integration tests for payment flow
- [ ] Test wallet integration
- [ ] Test facilitator HTTP endpoints

**Testing Structure**:
```
tests/
├── integration/
│   ├── payment-flow.test.ts
│   ├── contract.test.ts
│   ├── facilitator.test.ts
│   └── wallet.test.ts
```

**Deliverables**:
- Integration test suite
- Devnet setup documentation

---

### Step 6.3: Contract Tests

**Tasks**:
- [ ] Set up Scarb for Cairo testing
- [ ] Write Cairo contract unit tests
- [ ] Test edge cases (replay attacks, expired payments, etc.)
- [ ] Test token transfer logic

**Testing Structure**:
```
contracts/
├── src/
│   └── PaymentAuthorization.cairo
└── tests/
    └── test_payment_authorization.cairo
```

**Deliverables**:
- Cairo contract test suite
- Security test scenarios

---

## Phase 7: Documentation & Examples (Days 16-17)

### Step 7.1: API Documentation

**Tasks**:
- [ ] Create comprehensive README
- [ ] Document all public APIs with JSDoc
- [ ] Create API reference documentation
- [ ] Add usage examples for each function

**Documentation Files**:
- `README.md` - Main project documentation
- `API.md` - Complete API reference
- `ARCHITECTURE.md` - System architecture
- `CONTRACTS.md` - Cairo contract documentation

**Deliverables**:
- Complete documentation set
- Code examples throughout

---

### Step 7.2: Example Applications

**Tasks**:
- [ ] Create `examples/` directory
- [ ] Build simple payment server example
- [ ] Build client example (browser and Node.js)
- [ ] Build facilitator deployment example
- [ ] Create AI agent example

**Example Structure**:
```
examples/
├── server/
│   └── simple-paywall.ts
├── client/
│   ├── browser/
│   │   └── index.html
│   └── node/
│       └── client.ts
├── facilitator/
│   └── deploy-facilitator.ts
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
- [ ] Document differences and breaking changes
- [ ] Provide code comparison examples

**Files to create**:
- `MIGRATION.md` - Migration guide

**Deliverables**:
- Migration documentation
- Side-by-side code comparisons

---

## Phase 8: Package & Distribution (Days 18-19)

### Step 8.1: Package Configuration

**Tasks**:
- [ ] Configure package.json for npm publication
- [ ] Set up build scripts with Bun
- [ ] Create type definition files (`.d.ts`)
- [ ] Configure exports for different module systems (ESM, CJS)

**Package.json Configuration**:
```json
{
  "name": "@x402/starknet",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./client": {
      "types": "./dist/client/index.d.ts",
      "import": "./dist/client/index.js"
    },
    "./facilitator": {
      "types": "./dist/facilitator/index.d.ts",
      "import": "./dist/facilitator/index.js"
    }
  }
}
```

**Deliverables**:
- Production-ready package configuration
- Build scripts

---

### Step 8.2: Build & Bundle

**Tasks**:
- [ ] Set up bundling with Bun
- [ ] Generate type definitions
- [ ] Optimize bundle size
- [ ] Test package installation

**Build Commands**:
```bash
bun run build      # Build library
bun run test       # Run all tests
bun run typecheck  # Type checking
bun run lint       # Linting
```

**Deliverables**:
- Bundled library
- Type definitions
- Build documentation

---

### Step 8.3: CI/CD Pipeline

**Tasks**:
- [ ] Set up GitHub Actions (or similar)
- [ ] Configure automated testing
- [ ] Set up automated publishing
- [ ] Add code quality checks

**CI/CD Workflow**:
```yaml
# .github/workflows/ci.yml
- Run linter
- Run type checker
- Run unit tests
- Run integration tests (on devnet)
- Build package
- Upload coverage reports
```

**Deliverables**:
- Automated CI/CD pipeline
- Quality gates

---

## Phase 9: Advanced Features (Days 20-22)

### Step 9.1: Batch Payments

**Tasks**:
- [ ] Add support for multiple payments in single transaction
- [ ] Update Cairo contract for batch processing
- [ ] Implement client-side batch API

**Batch API**:
```typescript
export async function createBatchPaymentHeader(
  account: Account,
  paymentRequirements: StarknetPaymentRequirements[]
): Promise<string>;
```

**Deliverables**:
- Batch payment support
- Gas optimization

---

### Step 9.2: Advanced Account Support

**Tasks**:
- [ ] Support for multisig accounts
- [ ] Support for session keys
- [ ] Support for account plugins

**Deliverables**:
- Extended account support
- Documentation for advanced accounts

---

### Step 9.3: Gas Optimization

**Tasks**:
- [ ] Optimize Cairo contract gas usage
- [ ] Implement gas estimation for clients
- [ ] Add fee configuration options

**Deliverables**:
- Gas-optimized implementation
- Fee estimation utilities

---

## Phase 10: Production Readiness (Days 23-25)

### Step 10.1: Security Audit Preparation

**Tasks**:
- [ ] Review all code for security issues
- [ ] Document security assumptions
- [ ] Create security testing checklist
- [ ] Add security best practices documentation

**Security Checklist**:
- Signature verification
- Replay attack protection
- Reentrancy protection
- Integer overflow protection
- Access control
- Input validation

**Deliverables**:
- Security documentation
- Audit preparation materials

---

### Step 10.2: Performance Testing

**Tasks**:
- [ ] Benchmark client operations
- [ ] Benchmark facilitator throughput
- [ ] Test under load
- [ ] Optimize bottlenecks

**Deliverables**:
- Performance benchmarks
- Optimization documentation

---

### Step 10.3: Mainnet Deployment

**Tasks**:
- [ ] Deploy contracts to Starknet mainnet
- [ ] Update network configurations
- [ ] Create mainnet documentation
- [ ] Set up monitoring and alerts

**Deliverables**:
- Mainnet-ready deployment
- Production documentation
- Monitoring setup

---

## Project Structure

Final project structure:
```
x402-starknet/
├── contracts/              # Cairo smart contracts
│   ├── src/
│   │   └── PaymentAuthorization.cairo
│   ├── tests/
│   └── Scarb.toml
├── src/
│   ├── types/             # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── payment.ts
│   │   ├── network.ts
│   │   ├── settlement.ts
│   │   └── schemas.ts
│   ├── networks/          # Network configurations
│   │   ├── index.ts
│   │   └── constants.ts
│   ├── client/            # Client-side API
│   │   ├── index.ts
│   │   ├── signer.ts
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
│   │   ├── hash.ts
│   │   └── crypto.ts
│   └── index.ts           # Main entry point
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── examples/              # Example applications
│   ├── server/
│   ├── client/
│   ├── facilitator/
│   └── agent/
├── scripts/               # Deployment and utility scripts
│   ├── deploy.ts
│   └── setup-devnet.ts
├── docs/                  # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── CONTRACTS.md
│   └── MIGRATION.md
├── .github/               # CI/CD
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── bunfig.toml
├── README.md
└── IMPLEMENTATION_PLAN.md # This file
```

## Dependencies

### Core Dependencies
- `starknet`: ^8.7.0 - Starknet.js library for blockchain interaction
- `@scure/base`: ^1.1.10 - Encoding utilities
- `zod`: ^3.24.2 - Runtime validation

### Development Dependencies
- `@types/bun`: latest - Bun type definitions
- `typescript`: ^5.7.0 - TypeScript compiler
- `vitest`: ^3.0.0 - Testing framework
- `eslint`: ^9.0.0 - Linting
- `prettier`: ^3.4.0 - Code formatting

### Cairo Dependencies
- `scarb`: Latest - Cairo package manager and build tool
- `starknet-foundry`: Latest - Cairo testing framework

## Success Criteria

### Functional Requirements
- [ ] Clients can create signed payment authorizations
- [ ] Servers can verify payments without execution
- [ ] Facilitators can settle payments on-chain
- [ ] Full compatibility with x402 protocol specification
- [ ] Support for Starknet mainnet and testnet

### Non-Functional Requirements
- [ ] >80% code coverage
- [ ] Type-safe TypeScript implementation
- [ ] Comprehensive documentation
- [ ] Working examples for all use cases
- [ ] Passing security checklist
- [ ] Performance benchmarks meet targets

### Release Criteria
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Examples working
- [ ] Contracts deployed to testnet
- [ ] CI/CD pipeline operational
- [ ] Security review completed
- [ ] npm package published

## Timeline

**Total Duration**: 25 days

- **Phase 1**: 2 days - Foundation
- **Phase 2**: 3 days - Smart Contracts
- **Phase 3**: 3 days - Client Implementation
- **Phase 4**: 3 days - Facilitator Implementation
- **Phase 5**: 2 days - Utilities
- **Phase 6**: 2 days - Testing
- **Phase 7**: 2 days - Documentation
- **Phase 8**: 2 days - Package & Distribution
- **Phase 9**: 3 days - Advanced Features
- **Phase 10**: 3 days - Production Readiness

## Risk Mitigation

### Technical Risks
1. **Cairo Contract Complexity**: Start with simple implementation, iterate
2. **Starknet RPC Reliability**: Implement retry logic and fallback providers
3. **Signature Compatibility**: Extensive testing with different wallets
4. **Gas Costs**: Early benchmarking and optimization

### Mitigation Strategies
- Incremental development with frequent testing
- Use devnet extensively before testnet
- Create comprehensive test coverage
- Regular code reviews
- Community feedback loops

## Next Steps

1. **Review and Approve Plan**: Get stakeholder approval
2. **Set Up Development Environment**: Install Bun, configure tooling
3. **Create GitHub Repository**: Initialize version control
4. **Begin Phase 1**: Start with project setup

---

## Appendix

### References
- x402 Specification: `/home/ametel/source/x402/specs/x402-specification.md`
- Original x402 Implementation: `/home/ametel/source/x402`
- Starknet.js Documentation: `/home/ametel/source/starknet.js`
- Starknet Documentation: https://docs.starknet.io
- Cairo Book: https://book.cairo-lang.org

### Glossary
- **EIP-3009**: Ethereum Improvement Proposal for transfer with authorization
- **Account Abstraction**: All accounts on Starknet are smart contracts
- **Felt**: Field element, basic type in Cairo (252-bit integer)
- **RPC**: Remote Procedure Call, interface to blockchain nodes
- **Devnet**: Local development network for testing

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Author**: Claude Code
**Status**: Ready for Review
