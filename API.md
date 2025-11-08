# @x402/starknet API Reference

Complete API documentation for the Starknet x402 payment protocol library.

**Version:** 0.1.0
**License:** MIT
**Protocol Version:** x402 v1

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Payment Operations](#core-payment-operations)
- [Network Utilities](#network-utilities)
- [Encoding Utilities](#encoding-utilities)
- [Constants](#constants)
- [TypeScript Types](#typescript-types)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Installation

```bash
npm install @x402/starknet starknet
# or
bun add @x402/starknet starknet
# or
yarn add @x402/starknet starknet
```

**Peer Dependencies:**
- `starknet` ^8.0.0

---

## Quick Start

```typescript
import {
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  getNetworkConfig,
  DEFAULT_PAYMASTER_ENDPOINTS,
} from '@x402/starknet';
import { Account, RpcProvider } from 'starknet';

// 1. Create payment payload (client-side)
const payload = await createPaymentPayload(
  account,
  1, // x402 version
  paymentRequirements,
  {
    endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'],
    network: 'starknet-sepolia',
  }
);

// 2. Verify payment (server-side)
const verification = await verifyPayment(
  provider,
  payload,
  paymentRequirements
);

if (!verification.isValid) {
  console.error('Payment invalid:', verification.invalidReason);
  return;
}

// 3. Settle payment (server-side)
const settlement = await settlePayment(
  provider,
  payload,
  paymentRequirements
);

console.log('Payment settled:', settlement.transaction);
```

---

## Core Payment Operations

### `createPaymentPayload`

Create a signed payment payload for an x402 request.

```typescript
function createPaymentPayload(
  account: Account,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
  paymasterConfig: PaymasterConfig
): Promise<PaymentPayload>
```

**Parameters:**
- `account` - User's Starknet account (from starknet.js)
- `x402Version` - x402 protocol version (currently `1`)
- `paymentRequirements` - Payment requirements from server's 402 response
- `paymasterConfig` - Paymaster configuration
  - `endpoint` - Paymaster RPC endpoint URL
  - `network` - Network identifier (`'starknet-mainnet'` | `'starknet-sepolia'` | `'starknet-devnet'`)
  - `apiKey?` - Optional API key for paymaster

**Returns:** `Promise<PaymentPayload>` - Signed payment payload to send to server

**Throws:**
- `PaymentError` - If payload creation fails
- `PaymasterError` - If paymaster interaction fails

**Example:**
```typescript
import { createPaymentPayload, DEFAULT_PAYMASTER_ENDPOINTS } from '@x402/starknet';

const payload = await createPaymentPayload(
  account,
  1,
  paymentRequirements,
  {
    endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'],
    network: 'starknet-sepolia',
  }
);
```

---

### `verifyPayment`

Verify a payment payload without executing the transaction.

```typescript
function verifyPayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse>
```

**Parameters:**
- `provider` - Starknet RPC provider
- `payload` - Payment payload from client
- `paymentRequirements` - Payment requirements to verify against

**Returns:** `Promise<VerifyResponse>` - Verification result

**VerifyResponse:**
```typescript
{
  isValid: boolean;
  invalidReason?: InvalidPaymentReason;
  payer: string;
  details?: {
    balance?: string;
    error?: string;
  };
}
```

**Invalid Reasons:**
- `'invalid_signature'` - Signature verification failed
- `'insufficient_balance'` - Payer has insufficient token balance
- `'invalid_network'` - Network mismatch
- `'invalid_amount'` - Amount mismatch
- `'unknown_error'` - Unexpected error (check `details.error`)

**Example:**
```typescript
const verification = await verifyPayment(provider, payload, requirements);

if (!verification.isValid) {
  console.error('Invalid payment:', verification.invalidReason);
  console.error('Details:', verification.details);
  return;
}

console.log('Payment valid from:', verification.payer);
```

---

### `settlePayment`

Execute a verified payment transaction via paymaster.

```typescript
function settlePayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  options?: {
    paymasterConfig?: {
      endpoint?: string;
      network?: string;
      apiKey?: string;
    };
  }
): Promise<SettleResponse>
```

**Parameters:**
- `provider` - Starknet RPC provider
- `payload` - Payment payload from client
- `paymentRequirements` - Payment requirements
- `options?` - Optional settlement configuration
  - `paymasterConfig?` - Override paymaster configuration

**Returns:** `Promise<SettleResponse>` - Settlement result

**SettleResponse:**
```typescript
{
  success: boolean;
  errorReason?: string;
  transaction: string;
  network: StarknetNetwork;
  payer: string;
  status?: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  blockNumber?: number;
  blockHash?: string;
}
```

**Throws:**
- `PaymentError` - If settlement fails
- `PaymasterError` - If paymaster execution fails

**Example:**
```typescript
const settlement = await settlePayment(provider, payload, requirements);

if (!settlement.success) {
  console.error('Settlement failed:', settlement.errorReason);
  return;
}

console.log('Transaction:', settlement.transaction);
console.log('Status:', settlement.status);
console.log('Block:', settlement.blockNumber);
```

---

## Network Utilities

### `getNetworkConfig`

Get network configuration for a Starknet network.

```typescript
function getNetworkConfig(network: StarknetNetwork): NetworkConfig
```

**Parameters:**
- `network` - Network identifier

**Returns:** `NetworkConfig` - Network configuration

**Example:**
```typescript
import { getNetworkConfig } from '@x402/starknet';

const config = getNetworkConfig('starknet-sepolia');
console.log('RPC URL:', config.rpcUrl);
console.log('Chain ID:', config.chainId);
console.log('Explorer:', config.explorerUrl);
```

---

### `getTransactionUrl`

Get block explorer URL for a transaction.

```typescript
function getTransactionUrl(
  network: StarknetNetwork,
  txHash: string
): string | null
```

**Parameters:**
- `network` - Network identifier
- `txHash` - Transaction hash

**Returns:** `string | null` - Explorer URL or null if no explorer available

**Example:**
```typescript
const url = getTransactionUrl('starknet-sepolia', '0x1234...');
// Returns: 'https://sepolia.starkscan.co/tx/0x1234...'
```

---

### `getAddressUrl`

Get block explorer URL for an address.

```typescript
function getAddressUrl(
  network: StarknetNetwork,
  address: string
): string | null
```

**Parameters:**
- `network` - Network identifier
- `address` - Contract or account address

**Returns:** `string | null` - Explorer URL or null if no explorer available

**Example:**
```typescript
const url = getAddressUrl('starknet-sepolia', '0xabcd...');
// Returns: 'https://sepolia.starkscan.co/contract/0xabcd...'
```

---

### `isTestnet`

Check if a network is a testnet.

```typescript
function isTestnet(network: StarknetNetwork): boolean
```

**Example:**
```typescript
console.log(isTestnet('starknet-sepolia')); // true
console.log(isTestnet('starknet-mainnet')); // false
```

---

### `isMainnet`

Check if a network is mainnet.

```typescript
function isMainnet(network: StarknetNetwork): boolean
```

---

### `getSupportedNetworks`

Get all supported Starknet networks.

```typescript
function getSupportedNetworks(): Array<StarknetNetwork>
```

**Returns:** `Array<StarknetNetwork>` - Array of network identifiers

**Example:**
```typescript
const networks = getSupportedNetworks();
// Returns: ['starknet-mainnet', 'starknet-sepolia', 'starknet-devnet']
```

---

## Encoding Utilities

### `encodePaymentHeader`

Encode payment payload to base64 for HTTP `X-Payment` header.

```typescript
function encodePaymentHeader(payload: PaymentPayload): string
```

**Parameters:**
- `payload` - Payment payload

**Returns:** `string` - Base64-encoded payload

**Example:**
```typescript
import { encodePaymentHeader } from '@x402/starknet';

const encoded = encodePaymentHeader(payload);

// Use in HTTP header
fetch(url, {
  headers: {
    'X-Payment': encoded,
  },
});
```

---

### `decodePaymentHeader`

Decode base64 payment header back to payload.

```typescript
function decodePaymentHeader(encoded: string): PaymentPayload
```

**Parameters:**
- `encoded` - Base64-encoded payment header

**Returns:** `PaymentPayload` - Decoded payment payload

**Throws:**
- `PaymentError` - If decoding or validation fails

**Example:**
```typescript
import { decodePaymentHeader } from '@x402/starknet';

const header = request.headers.get('X-Payment');
const payload = decodePaymentHeader(header);
```

---

## Constants

### `VERSION`

Library version.

```typescript
const VERSION: string = '0.1.0'
```

---

### `X402_VERSION`

Supported x402 protocol version.

```typescript
const X402_VERSION: number = 1
```

---

### `DEFAULT_PAYMASTER_ENDPOINTS`

Default AVNU paymaster endpoints for each network.

```typescript
const DEFAULT_PAYMASTER_ENDPOINTS: {
  readonly 'starknet-mainnet': 'https://starknet.paymaster.avnu.fi';
  readonly 'starknet-sepolia': 'https://sepolia.paymaster.avnu.fi';
  readonly 'starknet-devnet': 'http://localhost:5555';
}
```

**Example:**
```typescript
import { DEFAULT_PAYMASTER_ENDPOINTS } from '@x402/starknet';

const endpoint = DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'];
```

---

### `NETWORK_CONFIGS`

Network configurations for all supported networks.

```typescript
const NETWORK_CONFIGS: {
  readonly [K in StarknetNetwork]: NetworkConfig;
}
```

**Example:**
```typescript
import { NETWORK_CONFIGS } from '@x402/starknet';

const sepoliaConfig = NETWORK_CONFIGS['starknet-sepolia'];
console.log('RPC:', sepoliaConfig.rpcUrl);
```

---

## TypeScript Types

### `StarknetNetwork`

Supported Starknet network identifiers.

```typescript
type StarknetNetwork =
  | 'starknet-mainnet'
  | 'starknet-sepolia'
  | 'starknet-devnet';
```

---

### `NetworkConfig`

Network configuration.

```typescript
interface NetworkConfig {
  readonly network: StarknetNetwork;
  readonly chainId: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string | null;
  readonly name: string;
}
```

---

### `PaymentScheme`

Payment scheme (currently only 'exact' is supported).

```typescript
type PaymentScheme = 'exact';
```

---

### `PaymentRequirements`

Payment requirements from server's 402 response.

```typescript
interface PaymentRequirements {
  readonly scheme: PaymentScheme;
  readonly network: StarknetNetwork;
  readonly maxAmountRequired: string;
  readonly asset: string;
  readonly payTo: string;
  readonly resource: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly maxTimeoutSeconds?: number;
  readonly extra?: {
    readonly tokenName?: string;
    readonly tokenSymbol?: string;
    readonly tokenDecimals?: number;
    readonly paymentContract?: string;
  };
}
```

---

### `PaymentPayload`

Payment payload sent from client to server.

```typescript
interface PaymentPayload {
  readonly x402Version: 1;
  readonly scheme: PaymentScheme;
  readonly network: StarknetNetwork;
  readonly payload: {
    readonly signature: {
      readonly r: string;
      readonly s: string;
    };
    readonly authorization: {
      readonly from: string;
      readonly to: string;
      readonly amount: string;
      readonly token: string;
      readonly nonce: string;
      readonly validUntil: string;
    };
  };
}
```

---

### `PaymentRequirementsResponse`

Server's 402 response with payment requirements.

```typescript
interface PaymentRequirementsResponse {
  readonly x402Version: 1;
  readonly paymentRequirements: ReadonlyArray<PaymentRequirements>;
}
```

---

### `VerifyResponse`

Result of payment verification.

```typescript
interface VerifyResponse {
  readonly isValid: boolean;
  readonly invalidReason?: InvalidPaymentReason;
  readonly payer: string;
  readonly details?: {
    readonly balance?: string;
    readonly error?: string;
  };
}
```

---

### `SettleResponse`

Result of payment settlement.

```typescript
interface SettleResponse {
  readonly success: boolean;
  readonly errorReason?: string;
  readonly transaction: string;
  readonly network: StarknetNetwork;
  readonly payer: string;
  readonly status?: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  readonly blockNumber?: number;
  readonly blockHash?: string;
}
```

---

### `PaymasterConfig`

Paymaster configuration.

```typescript
interface PaymasterConfig {
  readonly endpoint: string;
  readonly network: string;
  readonly apiKey?: string;
}
```

---

### `InvalidPaymentReason`

Reasons why a payment might be invalid.

```typescript
type InvalidPaymentReason =
  | 'invalid_signature'
  | 'insufficient_balance'
  | 'nonce_used'
  | 'expired'
  | 'invalid_network'
  | 'invalid_amount'
  | 'token_not_approved'
  | 'invalid_recipient'
  | 'contract_error'
  | 'unknown_error';
```

---

## Error Handling

All errors extend from `X402Error` with stable error codes.

### `X402Error`

Base error class.

```typescript
class X402Error extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

---

### `PaymentError`

Payment-related errors.

```typescript
class PaymentError extends X402Error {
  static invalidPayload(details?: string): PaymentError;
  static insufficientBalance(required: string, available: string): PaymentError;
  static verificationFailed(reason: string): PaymentError;
  static settlementFailed(reason: string): PaymentError;
}
```

**Error Codes:**
- `INVALID_PAYLOAD` - Payment payload validation failed
- `INSUFFICIENT_BALANCE` - Payer has insufficient balance
- `VERIFICATION_FAILED` - Payment verification failed
- `SETTLEMENT_FAILED` - Payment settlement failed

**Example:**
```typescript
try {
  const payload = await createPaymentPayload(...);
} catch (error) {
  if (error instanceof PaymentError) {
    console.error('Payment error:', error.code, error.message);

    if (error.code === 'INSUFFICIENT_BALANCE') {
      // Handle insufficient balance
    }
  }
}
```

---

### `NetworkError`

Network-related errors.

```typescript
class NetworkError extends X402Error {
  static unsupportedNetwork(network: string): NetworkError;
  static networkMismatch(expected: string, actual: string): NetworkError;
  static rpcFailed(details: string): NetworkError;
}
```

**Error Codes:**
- `UNSUPPORTED_NETWORK` - Network is not supported
- `NETWORK_MISMATCH` - Network mismatch between payload and requirements
- `RPC_FAILED` - RPC call failed

---

### `PaymasterError`

Paymaster interaction errors.

```typescript
class PaymasterError extends Error {
  readonly code: number;
  constructor(message: string, code: number);
}
```

---

### `ERROR_CODES`

All error codes as constants.

```typescript
const ERROR_CODES: {
  readonly INVALID_PAYLOAD: 'INVALID_PAYLOAD';
  readonly INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE';
  readonly VERIFICATION_FAILED: 'VERIFICATION_FAILED';
  readonly SETTLEMENT_FAILED: 'SETTLEMENT_FAILED';
  readonly UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK';
  readonly NETWORK_MISMATCH: 'NETWORK_MISMATCH';
  readonly RPC_FAILED: 'RPC_FAILED';
  readonly PAYMASTER_ERROR: 'PAYMASTER_ERROR';
  readonly PAYMASTER_UNAVAILABLE: 'PAYMASTER_UNAVAILABLE';
}
```

---

## Examples

### Complete Client-Side Flow

```typescript
import {
  createPaymentPayload,
  encodePaymentHeader,
  DEFAULT_PAYMASTER_ENDPOINTS,
} from '@x402/starknet';
import { Account, RpcProvider } from 'starknet';

async function payForResource(url: string, account: Account) {
  try {
    // 1. Try to access resource without payment
    let response = await fetch(url);

    // 2. If 402 Payment Required, get payment requirements
    if (response.status === 402) {
      const { paymentRequirements } = await response.json();
      const requirement = paymentRequirements[0];

      // 3. Create payment payload
      const payload = await createPaymentPayload(
        account,
        1,
        requirement,
        {
          endpoint: DEFAULT_PAYMASTER_ENDPOINTS[requirement.network],
          network: requirement.network,
        }
      );

      // 4. Retry request with payment
      response = await fetch(url, {
        headers: {
          'X-Payment': encodePaymentHeader(payload),
        },
      });
    }

    // 5. Access resource
    if (response.ok) {
      const data = await response.json();
      return data;
    }

    throw new Error(`Request failed: ${response.status}`);
  } catch (error) {
    console.error('Payment flow failed:', error);
    throw error;
  }
}
```

---

### Complete Server-Side Flow

```typescript
import {
  decodePaymentHeader,
  verifyPayment,
  settlePayment,
  type PaymentRequirements,
} from '@x402/starknet';
import { RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://...' });

const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'starknet-sepolia',
  maxAmountRequired: '1000000', // 1 USDC
  asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  payTo: '0x1234...', // Your address
  resource: 'https://api.example.com/data',
  description: 'Premium API access',
};

async function handleRequest(request: Request) {
  const paymentHeader = request.headers.get('X-Payment');

  // No payment header - return 402
  if (!paymentHeader) {
    return new Response(
      JSON.stringify({
        x402Version: 1,
        paymentRequirements: [requirements],
      }),
      {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Decode payment
    const payload = decodePaymentHeader(paymentHeader);

    // Verify payment
    const verification = await verifyPayment(provider, payload, requirements);
    if (!verification.isValid) {
      return new Response(
        JSON.stringify({ error: verification.invalidReason }),
        { status: 400 }
      );
    }

    // Settle payment
    const settlement = await settlePayment(provider, payload, requirements);
    if (!settlement.success) {
      return new Response(
        JSON.stringify({ error: settlement.errorReason }),
        { status: 500 }
      );
    }

    // Payment successful - return resource
    return new Response(
      JSON.stringify({ data: 'Premium content', tx: settlement.transaction }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment processing failed:', error);
    return new Response(
      JSON.stringify({ error: 'Payment processing failed' }),
      { status: 500 }
    );
  }
}
```

---

## Tree-Shaking

This library is fully tree-shakeable. Only import what you need:

```typescript
// ✅ Good - only imports what you use
import { createPaymentPayload, verifyPayment } from '@x402/starknet';

// ❌ Avoid - imports everything
import * as x402 from '@x402/starknet';
```

The library has `"sideEffects": false` in package.json, ensuring optimal bundle sizes.

---

## API Stability

This library follows semantic versioning:

- **MAJOR** version for breaking API changes
- **MINOR** version for new features (backwards-compatible)
- **PATCH** version for bug fixes

Current API is **experimental** (v0.x.x). Breaking changes may occur in minor releases until v1.0.0.

---

## License

MIT © 2025
