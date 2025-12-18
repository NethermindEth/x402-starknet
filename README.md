# x402-starknet

**Pure library for implementing the x402 payment protocol on Starknet**

A TypeScript library providing core functions for building x402-compatible payment systems on Starknet. Designed as a foundation library with a minimal, stable API surface.

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/NethermindEth/x402-starknet)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

## Overview

This library implements the [x402 payment protocol](https://github.com/coinbase/x402) v2 for Starknet, enabling applications to accept micropayments for digital resources using HTTP 402 status codes.

## Features

- **Minimal API Surface** - 37 named exports, all essential
- **Type Safe** - Complete TypeScript support with strict types
- **Starknet Native** - Built for Starknet's architecture with paymaster support
- **Multi-Network** - Mainnet, Sepolia testnet, and devnet (CAIP-2 format)
- **Tree-Shakeable** - `sideEffects: false`, import only what you need
- **Validated** - Runtime validation with Zod schemas (internal)
- **Minimal Runtime Deps** - Only `zod`
- **Spec Compliant** - Full x402 v2 protocol compliance
- **Extensible** - Built-in extensions system with JSON Schema validation
- **Secure** - Signature verification via SNIP-6, expiration checking, balance validation

## Installation

```bash
npm install x402-starknet starknet
# or
bun add x402-starknet starknet
# or
yarn add x402-starknet starknet
```

**Peer Dependencies:**

- `starknet` ^8.0.0

## Quick Start

```typescript
import {
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  DEFAULT_PAYMASTER_ENDPOINTS,
  HTTP_HEADERS,
  encodePaymentSignature,
  type PaymentRequirements,
} from 'x402-starknet';
import { Account, RpcProvider } from 'starknet';

// 1. Create payment payload (client-side)
const payload = await createPaymentPayload(
  account, // Starknet account
  2, // x402 protocol version
  paymentRequirements, // From server's 402 response
  {
    endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet:sepolia'],
    network: 'starknet:sepolia',
  }
);

// 2. Verify payment (server-side)
const provider = new RpcProvider({ nodeUrl: 'https://...' });
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
const settlement = await settlePayment(provider, payload, paymentRequirements);

console.log('Payment settled:', settlement.transaction);
console.log('Status:', settlement.status);
```

## Public API

This library exports **37 symbols** from a single entry point:

### Core Functions (3)

- `createPaymentPayload()` - Create signed payment payload
- `verifyPayment()` - Verify payment validity (signature, expiration, balance)
- `settlePayment()` - Execute payment transaction

### Encoding Utilities (7)

- `encodePaymentSignature()` - Encode payment payload for `PAYMENT-SIGNATURE` header
- `decodePaymentSignature()` - Decode payment payload from base64
- `encodePaymentRequired()` - Encode 402 response for `PAYMENT-REQUIRED` header
- `decodePaymentRequired()` - Decode 402 response from base64
- `encodePaymentResponse()` - Encode settlement response for `PAYMENT-RESPONSE` header
- `decodePaymentResponse()` - Decode settlement response from base64
- `HTTP_HEADERS` - Standard header names constant

### Network Utilities (6)

- `getNetworkConfig()` - Get network configuration
- `getTransactionUrl()` - Get explorer URL for transaction
- `getAddressUrl()` - Get explorer URL for address
- `isTestnet()` - Check if network is testnet
- `isMainnet()` - Check if network is mainnet
- `getSupportedNetworks()` - Get all supported networks

### Facilitator Client (2)

- `FacilitatorClient` - HTTP client for facilitator API
- `createFacilitatorClient()` - Factory function

### Extensions System (10)

- `ExtensionRegistry` - Extension registry class
- `createExtensionRegistry()` - Factory function
- `globalRegistry` - Global registry instance
- `createExtensionData()` - Create extension data
- `getExtensionInfo()` - Extract extension info
- `hasExtension()` - Check for extension
- `getExtensionNames()` - Get extension names
- `mergeExtensions()` - Merge extension records
- `filterRegisteredExtensions()` - Filter to registered only
- `validateExtensions()` - Validate all extensions
- `defineExtension()` - Define extension helper

### Constants (4)

- `VERSION` - Library version (`'0.2.0'`)
- `X402_VERSION` - Protocol version (`2`)
- `DEFAULT_PAYMASTER_ENDPOINTS` - AVNU paymaster endpoints
- `NETWORK_CONFIGS` - Network configurations

### Error Classes (4)

- `X402Error` - Base error class
- `PaymentError` - Payment-related errors
- `NetworkError` - Network-related errors
- `ERROR_CODES` - All error codes as constants

### TypeScript Types

All types are exported for TypeScript users:

```typescript
import type {
  StarknetNetwork,
  StarknetNetworkId,
  NetworkConfig,
  PaymentRequirements,
  PaymentRequired,
  PaymentPayload,
  ResourceInfo,
  VerifyResponse,
  SettleResponse,
  PaymasterConfig,
  Extension,
  IExtensionRegistry,
  FacilitatorClientConfig,
  ErrorCode,
} from 'x402-starknet';
```

## Usage Examples

### Error Handling

```typescript
import { PaymentError, ERROR_CODES, settlePayment } from 'x402-starknet';

try {
  const result = await settlePayment(provider, payload, requirements);
  console.log('Success:', result.transaction);
} catch (error) {
  if (error instanceof PaymentError) {
    switch (error.code) {
      case ERROR_CODES.ECONFLICT:
        console.error('Insufficient balance or conflict');
        break;
      case ERROR_CODES.EINVALID_INPUT:
        console.error('Invalid payload');
        break;
      default:
        console.error('Payment error:', error.message);
    }
  }
}
```

### Network Configuration

```typescript
import {
  getNetworkConfig,
  getTransactionUrl,
  isTestnet,
  NETWORK_CONFIGS,
} from 'x402-starknet';

// Get network config (CAIP-2 format)
const config = getNetworkConfig('starknet:sepolia');
console.log('RPC URL:', config.rpcUrl);
console.log('Chain ID:', config.chainId);

// Get explorer URL
const txUrl = getTransactionUrl('starknet:sepolia', '0x123...');
console.log('View transaction:', txUrl);

// Check network type
if (isTestnet('starknet:sepolia')) {
  console.log('Using testnet');
}

// All network configs
console.log('Available networks:', Object.keys(NETWORK_CONFIGS));
```

### Payment Header Encoding

```typescript
import {
  encodePaymentSignature,
  decodePaymentSignature,
  encodePaymentRequired,
  decodePaymentRequired,
  HTTP_HEADERS,
} from 'x402-starknet';

// Client: Encode payment payload for HTTP header
const encoded = encodePaymentSignature(payload);

// Client: Send in request
await fetch(url, {
  headers: {
    [HTTP_HEADERS.PAYMENT_SIGNATURE]: encoded,
  },
});

// Server: Decode payment from client
const header = request.headers.get(HTTP_HEADERS.PAYMENT_SIGNATURE);
const payload = decodePaymentSignature(header);

// Server: Encode payment requirements response
const paymentRequired = {
  x402Version: 2,
  error: 'Payment required',
  resource: { url: 'https://api.example.com/data' },
  accepts: [requirement1, requirement2],
};
const responseHeader = encodePaymentRequired(paymentRequired);

// Server: Send response via header
return new Response(null, {
  status: 402,
  headers: { [HTTP_HEADERS.PAYMENT_REQUIRED]: responseHeader },
});

// Client: Decode payment requirements from header
const paymentRequiredHeader = response.headers.get(
  HTTP_HEADERS.PAYMENT_REQUIRED
);
if (paymentRequiredHeader) {
  const requirements = decodePaymentRequired(paymentRequiredHeader);
  // Use requirements.accepts to create payment
}
```

### Using Facilitator Client

```typescript
import { createFacilitatorClient, HTTP_HEADERS } from 'x402-starknet';

const client = createFacilitatorClient({
  baseUrl: 'https://facilitator.example.com',
  apiKey: 'your-api-key',
  timeout: 60000,
});

// Verify payment
const verification = await client.verify(payload, requirements);

// Settle payment
const settlement = await client.settle(payload, requirements);

// Check supported schemes
const supported = await client.supported();
console.log('Supported:', supported.kinds);
```

### Using Extensions

```typescript
import {
  createExtensionRegistry,
  defineExtension,
  createExtensionData,
  hasExtension,
} from 'x402-starknet';

// Create and configure registry
const registry = createExtensionRegistry();

registry.register(
  defineExtension('receipts', {
    description: 'Payment receipts',
    schema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['pdf', 'json'] },
      },
      required: ['format'],
    },
  })
);

// Create extension data with validation
const receiptData = createExtensionData(
  {
    name: 'receipts',
    info: { format: 'pdf' },
    validate: true,
  },
  registry
);

// Check for extensions in payload
if (hasExtension(payload.extensions, 'receipts')) {
  // Handle receipts extension
}
```

## Complete Flow Example

### Client Side

```typescript
import {
  createPaymentPayload,
  encodePaymentSignature,
  decodePaymentRequired,
  DEFAULT_PAYMASTER_ENDPOINTS,
  HTTP_HEADERS,
} from 'x402-starknet';
import { Account } from 'starknet';

async function payForResource(url: string, account: Account) {
  // 1. Request resource
  let response = await fetch(url);

  // 2. Handle 402 Payment Required
  if (response.status === 402) {
    const header = response.headers.get(HTTP_HEADERS.PAYMENT_REQUIRED);
    const { accepts } = decodePaymentRequired(header!);
    const requirement = accepts[0];

    // 3. Create payment
    const payload = await createPaymentPayload(account, 2, requirement, {
      endpoint: DEFAULT_PAYMASTER_ENDPOINTS[requirement.network],
      network: requirement.network,
    });

    // 4. Retry with payment
    response = await fetch(url, {
      headers: {
        [HTTP_HEADERS.PAYMENT_SIGNATURE]: encodePaymentSignature(payload),
      },
    });
  }

  // 5. Access resource
  return response.json();
}
```

### Server Side

```typescript
import {
  decodePaymentSignature,
  verifyPayment,
  settlePayment,
  encodePaymentRequired,
  HTTP_HEADERS,
  type PaymentRequirements,
} from 'x402-starknet';
import { RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://...' });

const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'starknet:sepolia',
  amount: '1000000', // 1 USDC
  asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  payTo: '0x1234...', // Your address
  maxTimeoutSeconds: 60,
};

async function handleRequest(request: Request) {
  const paymentHeader = request.headers.get(HTTP_HEADERS.PAYMENT_SIGNATURE);

  // No payment - return 402
  if (!paymentHeader) {
    return new Response(null, {
      status: 402,
      headers: {
        [HTTP_HEADERS.PAYMENT_REQUIRED]: encodePaymentRequired({
          x402Version: 2,
          error: 'Payment required',
          resource: { url: 'https://api.example.com/data' },
          accepts: [requirements],
        }),
      },
    });
  }

  // Decode and verify
  const payload = decodePaymentSignature(paymentHeader);
  const verification = await verifyPayment(provider, payload, requirements);

  if (!verification.isValid) {
    return new Response(JSON.stringify({ error: verification.invalidReason }), {
      status: 400,
    });
  }

  // Settle payment
  const settlement = await settlePayment(provider, payload, requirements);

  if (!settlement.success) {
    return new Response(JSON.stringify({ error: settlement.errorReason }), {
      status: 500,
    });
  }

  // Return resource
  return new Response(
    JSON.stringify({ data: 'Premium content', tx: settlement.transaction })
  );
}
```

## Error Codes

All errors include stable, spec-compliant error codes for programmatic handling:

```typescript
const ERROR_CODES = {
  EINVALID_INPUT: 'EINVALID_INPUT', // Invalid input or payload
  ENOT_FOUND: 'ENOT_FOUND', // Resource not found
  ETIMEOUT: 'ETIMEOUT', // Operation timed out
  ECONFLICT: 'ECONFLICT', // Conflict (insufficient funds, mismatch)
  ECANCELLED: 'ECANCELLED', // Operation cancelled
  EINTERNAL: 'EINTERNAL', // Internal error
  ENETWORK: 'ENETWORK', // Network error
  EPAYMASTER: 'EPAYMASTER', // Paymaster error
};
```

## API Documentation

For complete API reference, see [API.md](./API.md).

For API design and best practices, see [API_SURFACE.md](./API_SURFACE.md).

## Network Support

Networks use CAIP-2 format identifiers:

| Network          | Identifier         | Chain ID                 | Status    |
| ---------------- | ------------------ | ------------------------ | --------- |
| Starknet Mainnet | `starknet:mainnet` | `0x534e5f4d41494e`       | Supported |
| Starknet Sepolia | `starknet:sepolia` | `0x534e5f5345504f4c4941` | Supported |
| Starknet Devnet  | `starknet:devnet`  | `0x534e5f474f45524c49`   | Supported |

## Development

### Setup

```bash
git clone https://github.com/NethermindEth/x402-starknet.git
cd x402-starknet
bun install
```

### Commands

```bash
bun run build          # Build TypeScript
bun run typecheck      # Type checking
bun run lint           # Lint code
bun run test           # Run tests
bun run test:watch     # Run tests in watch mode
bun run test:coverage  # Coverage report
bun run check          # Run all checks
```

### Testing

**465 tests** with comprehensive coverage:

```bash
bun run test
```

## Import Rules

**Do this** - Import from root:

```typescript
import { createPaymentPayload, verifyPayment } from 'x402-starknet';
```

**Don't do this** - Deep imports not supported:

```typescript
import { verifyPayment } from 'x402-starknet/payment'; // ERROR
```

## Design Principles

This library follows modern library best practices:

- **Small surface** - 37 exports
- **Named exports** - No wildcards, explicit imports
- **Single entry** - No subpath exports
- **Tree-shakeable** - `sideEffects: false`
- **Type-safe** - Strict TypeScript
- **Stable errors** - Spec-compliant error codes
- **Minimal deps** - Only 1 runtime dependency (zod)

See [API_SURFACE.md](./API_SURFACE.md) for detailed design decisions.

## Resources

- [Complete API Reference](./API.md)
- [Starknet x402 Scheme Specification](./docs/scheme_exact_starknet.md)
- [API Surface Design](./API_SURFACE.md)
- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [Starknet Documentation](https://docs.starknet.io)
- [Starknet.js](https://www.starknetjs.com/)

## License

Apache License 2.0 - see [LICENSE](./LICENSE) for details.

---

**Version**: 1.0.0 | **Protocol**: x402 v2 | **Tests**: 465 passing
