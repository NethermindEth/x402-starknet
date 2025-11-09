# x402-starknet

**Pure library for implementing the x402 payment protocol on Starknet**

A TypeScript library providing core functions for building x402-compatible payment systems on Starknet. Designed as a foundation library with a minimal, stable API surface.

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/NethermindEth/starknet-x402)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

## Overview

This library implements the [x402 payment protocol](https://github.com/x402) for Starknet, enabling applications to accept micropayments for digital resources using HTTP 402 status codes.

## Features

- 🎯 **Minimal API Surface** - Only 20 named exports, all essential
- 🚀 **Type Safe** - Complete TypeScript support with strict types
- 🔗 **Starknet Native** - Built for Starknet's architecture
- 🌐 **Multi-Network** - Mainnet, Sepolia testnet, and devnet
- 📦 **Tree-Shakeable** - `sideEffects: false`, import only what you need
- 🛡️ **Validated** - Runtime validation with Zod schemas (internal)
- ⚡ **Zero Runtime Deps** - Only `zod` and `@scure/base`

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
  type PaymentRequirements,
} from 'x402-starknet';
import { Account, RpcProvider } from 'starknet';

// 1. Create payment payload (client-side)
const payload = await createPaymentPayload(
  account,              // Starknet account
  1,                    // x402 protocol version
  paymentRequirements,  // From server's 402 response
  {
    endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'],
    network: 'starknet-sepolia',
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
const settlement = await settlePayment(
  provider,
  payload,
  paymentRequirements
);

console.log('Payment settled:', settlement.transaction);
console.log('Status:', settlement.status);
```

## Public API

This library exports **exactly 20 symbols** from a single entry point:

### Core Functions (11)

**Payment Operations:**
- `createPaymentPayload()` - Create signed payment payload
- `verifyPayment()` - Verify payment validity
- `settlePayment()` - Execute payment transaction

**Encoding:**
- `encodePaymentHeader()` - Encode payload to base64
- `decodePaymentHeader()` - Decode base64 to payload

**Network Utilities:**
- `getNetworkConfig()` - Get network configuration
- `getTransactionUrl()` - Get explorer URL for transaction
- `getAddressUrl()` - Get explorer URL for address
- `isTestnet()` - Check if network is testnet
- `isMainnet()` - Check if network is mainnet
- `getSupportedNetworks()` - Get all supported networks

### Constants (4)

- `VERSION` - Library version (`'0.1.0'`)
- `X402_VERSION` - Protocol version (`1`)
- `DEFAULT_PAYMASTER_ENDPOINTS` - AVNU paymaster endpoints
- `NETWORK_CONFIGS` - Network configurations

### Error Classes (4)

- `X402Error` - Base error class
- `PaymentError` - Payment-related errors
- `NetworkError` - Network-related errors
- `PaymasterError` - Paymaster errors

### Error Codes (1)

- `ERROR_CODES` - All error codes as constants

### TypeScript Types

All types are exported for TypeScript users:
```typescript
import type {
  StarknetNetwork,
  NetworkConfig,
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  PaymasterConfig,
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
      case ERROR_CODES.INSUFFICIENT_BALANCE:
        console.error('Insufficient balance');
        break;
      case ERROR_CODES.INVALID_PAYLOAD:
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

// Get network config
const config = getNetworkConfig('starknet-sepolia');
console.log('RPC URL:', config.rpcUrl);
console.log('Chain ID:', config.chainId);

// Get explorer URL
const txUrl = getTransactionUrl('starknet-sepolia', '0x123...');
console.log('View transaction:', txUrl);

// Check network type
if (isTestnet('starknet-sepolia')) {
  console.log('Using testnet');
}

// All network configs
console.log('Available networks:', Object.keys(NETWORK_CONFIGS));
```

### Payment Header Encoding

```typescript
import { encodePaymentHeader, decodePaymentHeader } from 'x402-starknet';

// Encode for HTTP header
const encoded = encodePaymentHeader(payload);

// Send in request
await fetch(url, {
  headers: {
    'X-Payment': encoded,
  },
});

// Decode on server
const header = request.headers.get('X-Payment');
const payload = decodePaymentHeader(header);
```

## Complete Flow Example

### Client Side

```typescript
import {
  createPaymentPayload,
  encodePaymentHeader,
  DEFAULT_PAYMASTER_ENDPOINTS,
  type PaymentRequirementsResponse,
} from 'x402-starknet';
import { Account } from 'starknet';

async function payForResource(url: string, account: Account) {
  // 1. Request resource
  let response = await fetch(url);

  // 2. Handle 402 Payment Required
  if (response.status === 402) {
    const { paymentRequirements } = await response.json() as PaymentRequirementsResponse;
    const requirement = paymentRequirements[0];

    // 3. Create payment
    const payload = await createPaymentPayload(
      account,
      1,
      requirement,
      {
        endpoint: DEFAULT_PAYMASTER_ENDPOINTS[requirement.network],
        network: requirement.network,
      }
    );

    // 4. Retry with payment
    response = await fetch(url, {
      headers: {
        'X-Payment': encodePaymentHeader(payload),
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
  decodePaymentHeader,
  verifyPayment,
  settlePayment,
  type PaymentRequirements,
} from 'x402-starknet';
import { RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://...' });

const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'starknet-sepolia',
  maxAmountRequired: '1000000', // 1 USDC
  asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  payTo: '0x1234...', // Your address
  resource: 'https://api.example.com/data',
};

async function handleRequest(request: Request) {
  const paymentHeader = request.headers.get('X-Payment');

  // No payment - return 402
  if (!paymentHeader) {
    return new Response(
      JSON.stringify({
        x402Version: 1,
        paymentRequirements: [requirements],
      }),
      { status: 402 }
    );
  }

  // Decode and verify
  const payload = decodePaymentHeader(paymentHeader);
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

  // Return resource
  return new Response(
    JSON.stringify({ data: 'Premium content', tx: settlement.transaction })
  );
}
```

## Error Codes

All errors include stable error codes for programmatic handling:

```typescript
const ERROR_CODES = {
  // Payment errors
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  SETTLEMENT_FAILED: 'SETTLEMENT_FAILED',

  // Network errors
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  NETWORK_MISMATCH: 'NETWORK_MISMATCH',
  RPC_FAILED: 'RPC_FAILED',

  // Paymaster errors
  PAYMASTER_ERROR: 'PAYMASTER_ERROR',
  PAYMASTER_UNAVAILABLE: 'PAYMASTER_UNAVAILABLE',
};
```

## API Documentation

For complete API reference, see [API.md](./API.md).

For API design and best practices, see [API_SURFACE.md](./API_SURFACE.md).

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Starknet Mainnet | `0x534e5f4d41494e` | ✅ Supported |
| Starknet Sepolia | `0x534e5f5345504f4c4941` | ✅ Supported |
| Starknet Devnet | `0x534e5f474f45524c49` | ✅ Supported |

## Development

### Setup

```bash
git clone https://github.com/yourusername/x402-starknet.git
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
```

### Testing

**78 tests** with comprehensive coverage:

```bash
bun run test
```

## Import Rules

✅ **Do this** - Import from root:
```typescript
import { createPaymentPayload, verifyPayment } from 'x402-starknet';
```

❌ **Don't do this** - Deep imports not supported:
```typescript
import { verifyPayment } from 'x402-starknet/payment'; // ERROR
```

## Design Principles

This library follows modern library best practices:

- **Small surface** - Only 20 exports
- **Named exports** - No wildcards, explicit imports
- **Single entry** - No subpath exports
- **Tree-shakeable** - `sideEffects: false`
- **Type-safe** - Strict TypeScript
- **Stable errors** - Error codes, not strings
- **Minimal deps** - Only 2 runtime dependencies

See [API_SURFACE.md](./API_SURFACE.md) for detailed design decisions.

## Building Applications

This library is designed to be used by applications. For a complete implementation, see:

**[voyager-x402](https://github.com/yourusername/voyager-x402)** - Reference implementation

## Contributing

Contributions welcome! This is a pure library - application code belongs in separate repos.

## Resources

- [Complete API Reference](./API.md)
- [API Surface Design](./API_SURFACE.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [x402 Protocol](https://github.com/x402)
- [Starknet Documentation](https://docs.starknet.io)
- [Starknet.js](https://www.starknetjs.com/)

## License

Apache License 2.0 - see [LICENSE](./LICENSE) for details.

---

**Version**: 0.1.0 | **Status**: ✅ Core Complete | **Tests**: 78 passing
