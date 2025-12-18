# x402-starknet v2 Upgrade Plan

This document outlines the step-by-step upgrade plan to migrate x402-starknet from x402 v1 to v2 specifications.

## Overview

The x402 v2 specification introduces significant changes including:

- New data structure organization with separated schemas
- CAIP-2 network identifiers
- New HTTP headers
- Extensions system
- Updated facilitator APIs
- Multi-transport support (HTTP, MCP, A2A)

---

## Phase 1: Core Type System Updates

### 1.1 Update Network Identifiers to CAIP-2 Format

**File:** `src/types/network.ts`, `src/networks/constants.ts`

**Current:**

```typescript
type StarknetNetwork =
  | 'starknet-mainnet'
  | 'starknet-sepolia'
  | 'starknet-devnet';
```

**Target:**

```typescript
// CAIP-2 format: "namespace:reference"
// For Starknet, using snip14 namespace (hypothetical - needs confirmation)
// or custom starknet namespace
type StarknetNetworkId =
  | 'starknet:SN_MAIN' // mainnet
  | 'starknet:SN_SEPOLIA' // sepolia testnet
  | 'starknet:SN_DEVNET'; // local devnet
```

**Tasks:**

- [ ] Research correct CAIP-2 namespace for Starknet (check CAIP registry)
- [ ] Update `StarknetNetwork` type to use CAIP-2 format
- [ ] Update `NETWORK_CONFIGS` constant with new identifiers
- [ ] Create mapping functions for backward compatibility
- [ ] Update `getNetworkFromChainId()` function

### 1.2 Create New ResourceInfo Type

**File:** `src/types/payment.ts` (new section)

**Add:**

```typescript
interface ResourceInfo {
  url: string; // URL of the protected resource
  description?: string; // Human-readable description
  mimeType?: string; // MIME type of expected response
}
```

### 1.3 Restructure PaymentRequirements

**File:** `src/types/payment.ts`

**Current:**

```typescript
interface PaymentRequirements {
  scheme: 'exact';
  network: StarknetNetwork;
  maxAmountRequired: string;      // ← rename to 'amount'
  asset: string;
  payTo: string;
  resource: string;               // ← move to ResourceInfo
  maxTimeoutSeconds: number;
  description?: string;           // ← move to ResourceInfo
  mimeType?: string;              // ← move to ResourceInfo
  outputSchema?: string;
  extra?: { ... };
}
```

**Target:**

```typescript
interface PaymentRequirements {
  scheme: 'exact';
  network: string; // CAIP-2 format
  amount: string; // renamed from maxAmountRequired
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    paymentContract?: string;
  };
}
```

### 1.4 Create PaymentRequired Response Type (402 Response)

**File:** `src/types/payment.ts`

**Add:**

```typescript
interface PaymentRequired {
  x402Version: 2;
  error?: string; // Human-readable error message
  resource: ResourceInfo;
  accepts: PaymentRequirements[]; // Array of acceptable payment methods
  extensions?: Record<string, ExtensionData>;
}

interface ExtensionData {
  info: unknown;
  schema?: object; // JSON Schema
}
```

### 1.5 Restructure PaymentPayload

**File:** `src/types/payment.ts`

**Current:**

```typescript
interface PaymentPayload {
  x402Version: 1;
  scheme: 'exact';
  network: StarknetNetwork;
  payload: {
    signature: Signature;
    authorization: PaymentAuthorization;
  };
  // ... other fields
}
```

**Target:**

```typescript
interface PaymentPayload {
  x402Version: 2;
  resource?: ResourceInfo;
  accepted: PaymentRequirements; // The chosen payment requirement
  payload: ExactStarknetPayload; // Scheme-specific payload
  extensions?: Record<string, unknown>;
}

interface ExactStarknetPayload {
  signature: Signature;
  authorization: PaymentAuthorization;
  typedData?: TypedDataV2; // For signature verification
  paymasterEndpoint?: string; // For settlement
}
```

### 1.6 Update Settlement Response Types

**File:** `src/types/settlement.ts`

**Update VerifyResponse:**

```typescript
interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string; // More specific error codes for v2
  payer?: string;
}
```

**Update SettleResponse:**

```typescript
interface SettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string; // Always present (empty string if failed)
  network: string; // CAIP-2 format
}
```

---

## Phase 2: Schema Updates (Zod)

### 2.1 Create ResourceInfo Schema

**File:** `src/types/schemas.ts`

```typescript
const RESOURCE_INFO_SCHEMA = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});
```

### 2.2 Update PaymentRequirements Schema

**File:** `src/types/schemas.ts`

- Rename `maxAmountRequired` to `amount`
- Update network to accept CAIP-2 format strings
- Remove resource-related fields (moved to ResourceInfo)

### 2.3 Create PaymentRequired Schema (402 Response)

**File:** `src/types/schemas.ts`

```typescript
const PAYMENT_REQUIRED_SCHEMA = z.object({
  x402Version: z.literal(2),
  error: z.string().optional(),
  resource: RESOURCE_INFO_SCHEMA,
  accepts: z.array(PAYMENT_REQUIREMENTS_SCHEMA),
  extensions: z.record(z.unknown()).optional(),
});
```

### 2.4 Update PaymentPayload Schema

**File:** `src/types/schemas.ts`

- Update x402Version to 2
- Add `resource` field (optional)
- Rename/restructure to use `accepted` instead of duplicate fields
- Add `extensions` field

### 2.5 Add Error Code Constants

**File:** `src/types/errors.ts` or `src/errors.ts`

Add Starknet-specific error codes following v2 pattern:

```typescript
const INVALID_PAYMENT_REASONS = {
  // Generic
  invalid_signature: 'invalid_signature',
  insufficient_funds: 'insufficient_funds',
  invalid_network: 'invalid_network',
  invalid_amount: 'invalid_amount',
  invalid_payload: 'invalid_payload',

  // Starknet-specific (following EVM pattern)
  invalid_exact_starknet_payload_authorization_valid_until:
    'invalid_exact_starknet_payload_authorization_valid_until',
  invalid_exact_starknet_payload_authorization_value:
    'invalid_exact_starknet_payload_authorization_value',
  invalid_exact_starknet_payload_signature:
    'invalid_exact_starknet_payload_signature',
  invalid_exact_starknet_payload_recipient_mismatch:
    'invalid_exact_starknet_payload_recipient_mismatch',

  // ... etc
} as const;
```

---

## Phase 3: HTTP Header Changes

### 3.1 Update Header Constants

**File:** `src/payment/create.ts` (or new `src/constants.ts`)

**Current:**

```typescript
// Uses X-PAYMENT header
```

**Target:**

```typescript
const HTTP_HEADERS = {
  PAYMENT_REQUIRED: 'PAYMENT-REQUIRED', // 402 response header
  PAYMENT_SIGNATURE: 'PAYMENT-SIGNATURE', // Client payment header
  PAYMENT_RESPONSE: 'PAYMENT-RESPONSE', // Settlement response header
} as const;
```

### 3.2 Update Encoding Functions

**File:** `src/payment/create.ts`

Rename and update functions:

- `encodePaymentHeader()` → `encodePaymentSignature()` (for PAYMENT-SIGNATURE)
- `decodePaymentHeader()` → `decodePaymentSignature()`
- `encodePaymentResponseHeader()` → `encodePaymentRequired()` (for PAYMENT-REQUIRED)
- `decodePaymentResponseHeader()` → `decodePaymentRequired()`
- Add new `encodePaymentResponse()` / `decodePaymentResponse()` (for PAYMENT-RESPONSE)

### 3.3 Maintain Backward Compatibility

**File:** `src/payment/create.ts`

Keep old function names as deprecated aliases:

```typescript
/** @deprecated Use encodePaymentSignature instead */
export const encodePaymentHeader = encodePaymentSignature;
```

---

## Phase 4: Verification Logic Updates

### 4.1 Update verifyPayment Function

**File:** `src/payment/verify.ts`

**Changes:**

1. Accept new PaymentPayload structure (with `accepted` field)
2. Extract requirements from `payload.accepted` instead of separate fields
3. Use CAIP-2 network comparison
4. Return updated error codes
5. Update amount field name (`amount` instead of `maxAmountRequired`)

### 4.2 Update Amount Validation

**File:** `src/payment/verify.ts`

```typescript
// Current
if (payload.payload.authorization.amount !== requirements.maxAmountRequired) {
  // ...
}

// Updated
if (payload.payload.authorization.amount !== payload.accepted.amount) {
  // ...
}
```

### 4.3 Update Network Validation

**File:** `src/payment/verify.ts`

Update to compare CAIP-2 format strings and handle legacy format gracefully.

---

## Phase 5: Payment Creation Updates

### 5.1 Update createPaymentPayload Function

**File:** `src/payment/create.ts`

**Changes:**

1. Accept `PaymentRequired` (new 402 response format) as input
2. Return updated `PaymentPayload` structure with `accepted` field
3. Set `x402Version: 2`
4. Include `resource` from PaymentRequired if provided

### 5.2 Update selectPaymentRequirements Function

**File:** `src/payment/create.ts`

Update to work with new `PaymentRequired.accepts` array structure.

---

## Phase 6: Settlement Updates

### 6.1 Update settlePayment Function

**File:** `src/payment/settle.ts`

**Changes:**

1. Work with new PaymentPayload structure
2. Return updated SettleResponse format
3. Extract requirements from `payload.accepted`

---

## Phase 7: Facilitator API Compatibility

### 7.1 Create Facilitator Client (Optional)

**File:** `src/facilitator/client.ts` (new)

If needed, create a client for the standard facilitator API:

```typescript
interface FacilitatorClient {
  verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse>;
  settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<SettleResponse>;
  supported(): Promise<SupportedResponse>;
}
```

### 7.2 Update /supported Response Type

**File:** `src/types/facilitator.ts` (new)

```typescript
interface SupportedResponse {
  kinds: Array<{
    x402Version: 2;
    scheme: 'exact';
    network: string;
    extra?: Record<string, unknown>;
  }>;
  extensions: string[];
  signers: Record<string, string[]>; // network pattern → signer addresses
}
```

---

## Phase 8: Extensions System

### 8.1 Create Extensions Types

**File:** `src/types/extensions.ts` (new)

```typescript
interface Extension {
  name: string;
  info: unknown;
  schema?: JSONSchema;
}

interface ExtensionRegistry {
  register(extension: Extension): void;
  get(name: string): Extension | undefined;
  validate(name: string, data: unknown): boolean;
}
```

### 8.2 Implement Basic Extension Support

**File:** `src/extensions/index.ts` (new)

Create foundation for extension support (can be minimal initially):

- Extension registration
- Schema validation
- Extension data passthrough in PaymentRequired/PaymentPayload

---

## Phase 9: Test Updates

### 9.1 Update Unit Tests

**Files:** `tests/unit/*.test.ts`

- Update all test fixtures to use v2 data structures
- Add tests for new field names (`amount` vs `maxAmountRequired`)
- Add tests for CAIP-2 network format
- Add tests for new headers

### 9.2 Add Migration Tests

**File:** `tests/unit/migration.test.ts` (new)

Test backward compatibility helpers:

- Legacy network identifier conversion
- Legacy payload structure handling
- Deprecated function aliases

### 9.3 Update Security Tests

**Files:** `tests/security/*.test.ts`

Ensure all security tests pass with new structures.

---

## Phase 10: Documentation & Exports

### 10.1 Update Type Exports

**File:** `src/types/index.ts`

Export new types:

- `ResourceInfo`
- `PaymentRequired`
- `ExtensionData`
- Updated `PaymentRequirements`
- Updated `PaymentPayload`

### 10.2 Update Main Exports

**File:** `src/index.ts`

- Export new encoding functions
- Export HTTP header constants
- Deprecate old function names

### 10.3 Update README

**File:** `README.md`

- Document v2 changes
- Update code examples
- Add migration guide section

---

## Phase 11: Optional Enhancements

### 11.1 MCP Transport Support

**File:** `src/transports/mcp.ts` (new)

Implement MCP transport layer:

- JSON-RPC error handling with code 402
- `_meta["x402/payment"]` payload handling

### 11.2 A2A Transport Support

**File:** `src/transports/a2a.ts` (new)

Implement A2A transport layer:

- Task-based state management
- Payment status lifecycle

### 11.3 Discovery API Types

**File:** `src/types/discovery.ts` (new)

Add discovery API support if needed:

```typescript
interface DiscoveryResource {
  resource: string;
  type: 'http' | 'mcp' | 'a2a';
  x402Version: 2;
  accepts: PaymentRequirements[];
  lastUpdated: number;
  metadata?: Record<string, unknown>;
}
```

---

## Migration Checklist

### Breaking Changes

- [ ] `maxAmountRequired` renamed to `amount`
- [ ] Network identifiers changed to CAIP-2 format
- [ ] HTTP headers renamed (X-PAYMENT → PAYMENT-SIGNATURE, etc.)
- [ ] `x402Version` changed from 1 to 2
- [ ] PaymentPayload structure reorganized (added `accepted` field)
- [ ] 402 response structure changed (PaymentRequirementsResponse → PaymentRequired)

### Backward Compatibility Measures

- [ ] Provide deprecated aliases for renamed functions
- [ ] Support parsing legacy network identifiers
- [ ] Document migration path

### Version Bump

- [ ] Update package.json version to 1.0.0 (major version for breaking changes)
- [ ] Update CHANGELOG.md

---

## Implementation Order

Recommended order to minimize conflicts:

1. **Phase 1.1-1.2**: Network types and ResourceInfo (foundation)
2. **Phase 2.1**: ResourceInfo schema
3. **Phase 1.3-1.6**: Remaining type updates
4. **Phase 2.2-2.5**: Remaining schema updates
5. **Phase 3**: Header changes
6. **Phase 4**: Verification logic
7. **Phase 5**: Payment creation
8. **Phase 6**: Settlement
9. **Phase 9**: Tests (in parallel with each phase)
10. **Phase 10**: Documentation
11. **Phase 7-8, 11**: Optional enhancements

---

## Estimated Scope

- **Core Changes**: ~15-20 files modified
- **New Files**: 3-5 files
- **Test Updates**: All 25 existing tests + new tests
- **Breaking Changes**: Yes (major version bump required)
