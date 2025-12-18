# Usage Examples

This guide provides practical examples for integrating the `@x402/starknet` library into your applications.

## Table of Contents

- [Complete Integration Example](#complete-integration-example)
- [Server-Side Examples](#server-side-examples)
  - [Building Payment Requirements](#building-payment-requirements)
  - [Validating Incoming Requests](#validating-incoming-requests)
  - [Verifying Payments](#verifying-payments)
  - [Settling Payments](#settling-payments)
- [Client-Side Examples](#client-side-examples)
  - [Creating Payment Payloads](#creating-payment-payloads)
- [Utility Examples](#utility-examples)
  - [Network Utilities](#network-utilities)
  - [Token Utilities](#token-utilities)
  - [Provider Factory](#provider-factory)

---

## Complete Integration Example

This example shows the full payment flow from building requirements to settlement:

```typescript
import {
  // Core functions
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  // Validation schemas
  PAYMENT_PAYLOAD_SCHEMA,
  PAYMENT_REQUIREMENTS_SCHEMA,
  // Network utilities
  isStarknetNetwork,
  validateNetwork,
  // Provider
  createProvider,
  // Paymaster
  createSettlementOptions,
  // Builders
  buildUSDCPayment,
  // Types
  type PaymentPayload,
  type PaymentRequirements,
} from '@x402/starknet';

// ============================================================================
// Server: Build payment requirements
// ============================================================================

const requirements = buildUSDCPayment({
  network: 'starknet:mainnet',
  amount: 1.5, // $1.50 USDC
  payTo: '0x1234567890abcdef...',
});

// Return requirements to client in 402 response
// The client will use these to create a payment

// ============================================================================
// Client: Create payment payload
// ============================================================================

// Client receives requirements and creates a signed payment
const payload = await createPaymentPayload(
  account, // Starknet account instance
  2, // x402 version
  requirements,
  {
    endpoint: 'https://starknet.paymaster.avnu.fi',
    network: 'starknet:mainnet',
  }
);

// Client sends payload back to server in PAYMENT-SIGNATURE header

// ============================================================================
// Server: Validate incoming request
// ============================================================================

// Parse and validate the incoming payload (type-safe)
const validatedPayload = PAYMENT_PAYLOAD_SCHEMA.parse(rawPayload);
const validatedRequirements =
  PAYMENT_REQUIREMENTS_SCHEMA.parse(rawRequirements);

// ============================================================================
// Server: Verify payment before providing resource
// ============================================================================

const provider = createProvider(validatedRequirements.network);

const verification = await verifyPayment(
  provider,
  validatedPayload,
  validatedRequirements
);

if (!verification.valid) {
  console.error('Payment invalid:', verification.invalidReason);
  // Return 402 with error details
}

// ============================================================================
// Server: Settle payment after providing resource
// ============================================================================

const settlementOptions = createSettlementOptions(
  validatedRequirements.network,
  {
    apiKey: process.env.PAYMASTER_API_KEY,
  }
);

const result = await settlePayment(
  provider,
  validatedPayload,
  validatedRequirements,
  settlementOptions
);

if (result.success) {
  console.log('Payment settled:', result.transaction);
} else {
  console.error('Settlement failed:', result.error);
}
```

---

## Server-Side Examples

### Building Payment Requirements

Use the builder utilities to create payment requirements with automatic token resolution and amount conversion:

```typescript
import {
  buildPaymentRequirements,
  buildETHPayment,
  buildSTRKPayment,
  buildUSDCPayment,
} from '@x402/starknet';

// Generic builder with any token
const requirements = buildPaymentRequirements({
  network: 'starknet:mainnet',
  amount: 1.5, // Human-readable amount
  asset: 'USDC', // Token symbol or contract address
  payTo: '0x1234...',
  maxTimeoutSeconds: 600, // Optional, defaults to 300
});

// Token-specific builders
const ethPayment = buildETHPayment({
  network: 'starknet:sepolia',
  amount: 0.001, // 0.001 ETH
  payTo: '0x1234...',
});

const strkPayment = buildSTRKPayment({
  network: 'starknet:sepolia',
  amount: 10, // 10 STRK
  payTo: '0x1234...',
});

const usdcPayment = buildUSDCPayment({
  network: 'starknet:mainnet', // USDC only on mainnet
  amount: 5.99, // $5.99 USDC
  payTo: '0x1234...',
});

// Using a custom token address
const customTokenPayment = buildPaymentRequirements({
  network: 'starknet:mainnet',
  amount: 1000000, // Amount in atomic units for custom tokens
  asset: '0xCustomTokenContractAddress...',
  payTo: '0x1234...',
  extra: {
    name: 'Custom Token',
    symbol: 'CTK',
    decimals: 18,
  },
});
```

### Validating Incoming Requests

Use Zod schemas for type-safe validation of incoming payment data:

```typescript
import {
  PAYMENT_PAYLOAD_SCHEMA,
  PAYMENT_REQUIREMENTS_SCHEMA,
  PAYMENT_REQUIRED_SCHEMA,
  type PaymentPayload,
  type PaymentRequirements,
} from '@x402/starknet';

// Parse and validate - throws on invalid data
function validatePaymentRequest(rawPayload: unknown, rawRequirements: unknown) {
  const payload: PaymentPayload = PAYMENT_PAYLOAD_SCHEMA.parse(rawPayload);
  const requirements: PaymentRequirements =
    PAYMENT_REQUIREMENTS_SCHEMA.parse(rawRequirements);

  return { payload, requirements };
}

// Safe parsing - returns result object
function safeValidatePayload(rawPayload: unknown) {
  const result = PAYMENT_PAYLOAD_SCHEMA.safeParse(rawPayload);

  if (result.success) {
    return { valid: true, payload: result.data };
  } else {
    return { valid: false, errors: result.error.errors };
  }
}

// Validate 402 response structure
function validatePaymentRequired(rawResponse: unknown) {
  return PAYMENT_REQUIRED_SCHEMA.parse(rawResponse);
}
```

### Verifying Payments

Verify that a payment is valid before providing the resource:

```typescript
import {
  verifyPayment,
  createProvider,
  type VerifyResponse,
} from '@x402/starknet';

async function handlePaymentVerification(
  payload: PaymentPayload,
  requirements: PaymentRequirements
): Promise<VerifyResponse> {
  const provider = createProvider(requirements.network);

  const verification = await verifyPayment(provider, payload, requirements);

  if (!verification.valid) {
    // Handle different failure reasons
    switch (verification.invalidReason) {
      case 'insufficient_funds':
        console.error('User has insufficient token balance');
        break;
      case 'expired':
        console.error('Payment authorization has expired');
        break;
      case 'invalid_signature':
        console.error('Payment signature is invalid');
        break;
      case 'network_mismatch':
        console.error('Payment network does not match requirements');
        break;
      default:
        console.error(
          'Payment verification failed:',
          verification.invalidReason
        );
    }
  }

  return verification;
}
```

### Settling Payments

Execute the payment transaction after providing the resource:

```typescript
import {
  settlePayment,
  createProvider,
  createSettlementOptions,
  createPaymasterConfig,
  type SettleResponse,
} from '@x402/starknet';

async function settleUserPayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements
): Promise<SettleResponse> {
  const provider = createProvider(requirements.network);

  // Option 1: Using createSettlementOptions helper
  const options = createSettlementOptions(requirements.network, {
    apiKey: process.env.PAYMASTER_API_KEY,
  });

  const result = await settlePayment(provider, payload, requirements, options);

  // Option 2: Using createPaymasterConfig directly
  const paymasterConfig = createPaymasterConfig(requirements.network, {
    endpoint: process.env.PAYMASTER_ENDPOINT,
    apiKey: process.env.PAYMASTER_API_KEY,
  });

  const result2 = await settlePayment(provider, payload, requirements, {
    paymasterConfig,
  });

  return result;
}
```

---

## Client-Side Examples

### Creating Payment Payloads

Create signed payment payloads from a Starknet wallet:

```typescript
import {
  createPaymentPayload,
  DEFAULT_PAYMASTER_ENDPOINTS,
  type PaymentPayload,
  type PaymentRequirements,
} from '@x402/starknet';
import { Account } from 'starknet';

async function createPayment(
  account: Account,
  requirements: PaymentRequirements
): Promise<PaymentPayload> {
  // Get the appropriate paymaster endpoint
  const paymasterEndpoint = DEFAULT_PAYMASTER_ENDPOINTS[requirements.network];

  const payload = await createPaymentPayload(
    account,
    2, // x402 version
    requirements,
    {
      endpoint: paymasterEndpoint,
      network: requirements.network,
    }
  );

  return payload;
}
```

---

## Utility Examples

### Network Utilities

Work with Starknet network identifiers:

```typescript
import {
  isStarknetNetwork,
  validateNetwork,
  parseStarknetNetwork,
  buildStarknetCAIP2,
  getNetworkReference,
  isTestnet,
  isMainnet,
  getSupportedNetworks,
  STARKNET_NETWORKS,
  NETWORK_NAMES,
} from '@x402/starknet';

// Type guard for network validation
function processRequest(network: string) {
  if (!isStarknetNetwork(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }

  // network is now typed as StarknetNetworkId
  console.log(`Processing for ${NETWORK_NAMES[network]}`);
}

// Validate and throw if invalid
const validNetwork = validateNetwork('starknet:sepolia');

// Parse CAIP-2 identifier
const parsed = parseStarknetNetwork('starknet:mainnet');
console.log(parsed); // { namespace: 'starknet', reference: 'mainnet' }

// Build CAIP-2 from reference
const caip2 = buildStarknetCAIP2('sepolia');
console.log(caip2); // 'starknet:sepolia'

// Get reference string
const reference = getNetworkReference('starknet:mainnet');
console.log(reference); // 'mainnet'

// Check network type
if (isTestnet('starknet:sepolia')) {
  console.log('Running on testnet');
}

if (isMainnet('starknet:mainnet')) {
  console.log('Running on mainnet - be careful!');
}

// Get all supported networks
const networks = getSupportedNetworks();
console.log(networks); // ['starknet:mainnet', 'starknet:sepolia', 'starknet:devnet']
```

### Token Utilities

Work with token addresses and amounts:

```typescript
import {
  getTokenAddress,
  getTokenDecimals,
  getTokenSymbol,
  toAtomicUnits,
  fromAtomicUnits,
  isTokenAvailable,
  getAvailableTokens,
  ETH_ADDRESSES,
  STRK_ADDRESSES,
  USDC_ADDRESSES,
  TOKEN_DECIMALS,
} from '@x402/starknet';

// Get token address for a network
const usdcAddress = getTokenAddress('USDC', 'starknet:mainnet');
const ethAddress = getTokenAddress('ETH', 'starknet:sepolia');

// Get token decimals
const usdcDecimals = getTokenDecimals('USDC'); // 6
const ethDecimals = getTokenDecimals('ETH'); // 18

// Convert between human-readable and atomic units
const atomicAmount = toAtomicUnits(1.5, 'USDC'); // '1500000'
const humanAmount = fromAtomicUnits('1500000', 'USDC'); // 1.5

// Identify token from address
const symbol = getTokenSymbol(usdcAddress, 'starknet:mainnet'); // 'USDC'

// Check token availability
if (isTokenAvailable('USDC', 'starknet:sepolia')) {
  console.log('USDC is available on sepolia');
} else {
  console.log('USDC is not available on sepolia');
}

// Get all available tokens for a network
const tokens = getAvailableTokens('starknet:mainnet');
console.log(tokens); // ['ETH', 'STRK', 'USDC']

const sepoliaTokens = getAvailableTokens('starknet:sepolia');
console.log(sepoliaTokens); // ['ETH', 'STRK']

// Direct access to address constants
console.log(ETH_ADDRESSES['starknet:mainnet']);
console.log(TOKEN_DECIMALS); // { ETH: 18, STRK: 18, USDC: 6 }
```

### Provider Factory

Create RPC providers with sensible defaults:

```typescript
import { createProvider, getChainId, DEFAULT_RPC_URLS } from '@x402/starknet';

// Create provider with default public RPC
const provider = createProvider('starknet:sepolia');

// Create provider with custom RPC URL
const customProvider = createProvider('starknet:mainnet', {
  rpcUrl: 'https://your-rpc-endpoint.com',
});

// Create provider with additional options
const configuredProvider = createProvider('starknet:mainnet', {
  rpcUrl: process.env.STARKNET_RPC_URL,
  headers: {
    'X-API-Key': process.env.RPC_API_KEY,
  },
});

// Get chain ID constant for Starknet.js
const chainId = getChainId('starknet:mainnet');
// Returns constants.StarknetChainId.SN_MAIN

// Access default RPC URLs
console.log(DEFAULT_RPC_URLS['starknet:sepolia']);
// 'https://starknet-sepolia.public.blastapi.io'
```

---

## Error Handling

Handle errors using the typed error classes:

```typescript
import {
  createPaymentPayload,
  X402Error,
  PaymentError,
  NetworkError,
  ERROR_CODES,
} from '@x402/starknet';

async function handlePayment() {
  try {
    const payload = await createPaymentPayload(
      account,
      2,
      requirements,
      config
    );
    return payload;
  } catch (error) {
    if (error instanceof PaymentError) {
      switch (error.code) {
        case ERROR_CODES.ECONFLICT:
          console.error('Insufficient funds:', error.message);
          break;
        case ERROR_CODES.EINVALID_INPUT:
          console.error('Invalid payload:', error.message);
          break;
        case ERROR_CODES.ETIMEOUT:
          console.error('Operation timed out:', error.message);
          break;
        default:
          console.error('Payment error:', error.message);
      }
    } else if (error instanceof NetworkError) {
      switch (error.code) {
        case ERROR_CODES.ENETWORK:
          console.error('Network error:', error.message);
          break;
        case ERROR_CODES.EPAYMASTER:
          console.error('Paymaster error:', error.message);
          break;
        default:
          console.error('Network-related error:', error.message);
      }
    } else if (error instanceof X402Error) {
      console.error('x402 error:', error.code, error.message);
    } else {
      throw error; // Re-throw unknown errors
    }
  }
}

// Using error factory methods
const insufficientFundsError = PaymentError.insufficientFunds(
  '1000000',
  '500000'
);
const unsupportedNetworkError =
  NetworkError.unsupportedNetwork('starknet:unknown');
```

---

## HTTP Header Utilities

Work with x402 HTTP headers:

```typescript
import {
  encodePaymentSignature,
  decodePaymentSignature,
  encodePaymentRequired,
  decodePaymentRequired,
  HTTP_HEADERS,
  type PaymentPayload,
  type PaymentRequired,
} from '@x402/starknet';

// Server: Create 402 response
function create402Response(paymentRequired: PaymentRequired): Response {
  const encoded = encodePaymentRequired(paymentRequired);

  return new Response(null, {
    status: 402,
    headers: {
      [HTTP_HEADERS.PAYMENT_REQUIRED]: encoded,
      'Content-Type': 'application/json',
    },
  });
}

// Client: Parse 402 response
function parse402Response(response: Response): PaymentRequired {
  const header = response.headers.get(HTTP_HEADERS.PAYMENT_REQUIRED);
  if (!header) {
    throw new Error('Missing PAYMENT-REQUIRED header');
  }
  return decodePaymentRequired(header);
}

// Client: Send payment in request
function createPaymentRequest(url: string, payload: PaymentPayload): Request {
  const encoded = encodePaymentSignature(payload);

  return new Request(url, {
    headers: {
      [HTTP_HEADERS.PAYMENT_SIGNATURE]: encoded,
    },
  });
}

// Server: Extract payment from request
function extractPayment(request: Request): PaymentPayload | null {
  const header = request.headers.get(HTTP_HEADERS.PAYMENT_SIGNATURE);
  if (!header) {
    return null;
  }
  return decodePaymentSignature(header);
}
```

---

## Extensions System

Work with protocol extensions:

```typescript
import {
  createExtensionRegistry,
  defineExtension,
  createExtensionData,
  hasExtension,
  validateExtensions,
  globalRegistry,
} from '@x402/starknet';

// Define a custom extension
const receiptsExtension = defineExtension('receipts', {
  description: 'Payment receipts for record-keeping',
  schema: {
    type: 'object',
    properties: {
      receiptId: { type: 'string' },
      timestamp: { type: 'number' },
    },
    required: ['receiptId'],
  },
});

// Create a registry and register extensions
const registry = createExtensionRegistry();
registry.register(receiptsExtension);

// Or use the global registry
globalRegistry.register(receiptsExtension);

// Create extension data for a payment
const extensionData = createExtensionData(registry, {
  receipts: {
    receiptId: 'rcpt_123456',
    timestamp: Date.now(),
  },
});

// Check if extensions are present
if (hasExtension(extensionData, 'receipts')) {
  console.log('Payment includes receipt data');
}

// Validate extensions against registry
const validation = validateExtensions(registry, extensionData);
if (!validation.valid) {
  console.error('Invalid extensions:', validation.errors);
}
```

---

## See Also

- [Paymaster Setup Guide](./paymaster-setup.md) - Configure paymaster for gasless transactions
- [Exact Scheme Specification](./scheme_exact_starknet.md) - Protocol specification details
- [API Surface](../API_SURFACE.md) - Complete API reference
