# @x402/starknet

**Pure library for implementing the x402 payment protocol on Starknet**

A TypeScript library providing core types, utilities, and functions for building x402-compatible payment systems on Starknet. This is a foundation library meant to be used by applications like [voyager-x402](https://github.com/yourusername/voyager-x402).

## Overview

This library implements the [x402 payment protocol](https://github.com/x402) for Starknet, allowing developers to build applications that accept micropayments for digital resources using HTTP 402 status codes. Built with TypeScript, Bun, and starknet.js.

## Features

- 🎯 **Pure Library** - No application code, just reusable building blocks
- 🚀 **Type Safe** - Complete TypeScript types with runtime validation
- 🔗 **Starknet Native** - Built for Starknet's unique architecture
- 🌐 **Multi-Network** - Support for mainnet, Sepolia testnet, and devnet
- 📦 **Modular** - Import only what you need
- 🛡️ **Validated** - Zod schemas for runtime type checking

## Installation

```bash
bun add @x402/starknet starknet
# or
npm install @x402/starknet starknet
```

## What's Included

This library provides:

### Core Functions
- `createPaymentPayload` - Build payment authorizations
- `verifyPayment` - Verify payment validity
- `settlePayment` - Execute and settle payments
- `selectPaymentRequirements` - Choose payment options

### Type System
- Complete TypeScript definitions
- Zod runtime validation schemas
- Network configurations
- Payment protocol types

### Utilities
- Token balance checking
- Provider management
- Encoding/decoding helpers
- Network utilities

## Quick Start

### Basic Payment Flow

```typescript
import {
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  createProvider,
  getTokenBalance
} from '@x402/starknet';
import { Account } from 'starknet';

// 1. Create a payment (client-side)
const payload = await createPaymentPayload(
  account,              // Starknet account
  1,                    // x402 version
  paymentRequirements,  // From server's 402 response
  { paymasterEndpoint: 'https://paymaster.avnu.fi' }
);

// 2. Verify a payment (server-side)
const provider = createProvider('starknet-sepolia');
const verification = await verifyPayment(
  provider,
  payload,
  paymentRequirements
);

if (verification.isValid) {
  // 3. Settle the payment
  const result = await settlePayment(
    provider,
    payload,
    paymentRequirements
  );

  console.log('Payment settled:', result.transaction);
}
```

### Using Individual Modules

```typescript
// Types only
import type {
  PaymentRequirements,
  PaymentPayload
} from '@x402/starknet/types';

// Network utilities
import {
  getNetworkConfig,
  isTestnet
} from '@x402/starknet/networks';

// Payment functions
import {
  createPaymentPayload,
  encodePaymentHeader
} from '@x402/starknet/payment';

// Utilities
import {
  getTokenBalance,
  createProvider
} from '@x402/starknet/utils';
```

## Library Structure

```
@x402/starknet
├── types/          # Type definitions and schemas
├── networks/       # Network configurations
├── payment/        # Core payment functions
│   ├── create      # Payment creation
│   ├── verify      # Payment verification
│   └── settle      # Payment settlement
├── paymaster/      # Paymaster integration (Phase 2)
└── utils/          # Utility functions
    ├── provider    # RPC provider utilities
    ├── token       # ERC20 token interactions
    └── encoding    # Encoding/serialization
```

## API Reference

### Payment Functions

#### `createPaymentPayload(account, x402Version, requirements, options)`
Create a payment authorization payload.

**Parameters:**
- `account: Account` - Starknet account for signing
- `x402Version: number` - Protocol version (currently 1)
- `requirements: PaymentRequirements` - Payment requirements from server
- `options?: object` - Optional configuration (paymaster endpoint, etc.)

**Returns:** `Promise<PaymentPayload>`

---

#### `verifyPayment(provider, payload, requirements)`
Verify a payment without executing it.

**Parameters:**
- `provider: RpcProvider` - Starknet RPC provider
- `payload: PaymentPayload` - Payment payload from client
- `requirements: PaymentRequirements` - Expected payment requirements

**Returns:** `Promise<VerifyResponse>`

---

#### `settlePayment(provider, payload, requirements, options)`
Execute and settle a verified payment.

**Parameters:**
- `provider: RpcProvider` - Starknet RPC provider
- `payload: PaymentPayload` - Payment payload from client
- `requirements: PaymentRequirements` - Payment requirements
- `options?: object` - Settlement options (paymaster config, etc.)

**Returns:** `Promise<SettleResponse>`

---

### Network Functions

#### `getNetworkConfig(network)`
Get configuration for a Starknet network.

```typescript
const config = getNetworkConfig('starknet-sepolia');
console.log(config.rpcUrl); // https://starknet-sepolia.public.blastapi.io
```

#### `createProvider(network)`
Create an RPC provider for a network.

```typescript
const provider = createProvider('starknet-sepolia');
```

---

### Token Utilities

#### `getTokenBalance(provider, tokenAddress, accountAddress)`
Get ERC20 token balance.

```typescript
const balance = await getTokenBalance(
  provider,
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH
  '0x1234...'
);
```

#### `getTokenMetadata(provider, tokenAddress)`
Get token name, symbol, and decimals.

```typescript
const metadata = await getTokenMetadata(provider, tokenAddress);
console.log(`${metadata.name} (${metadata.symbol})`);
```

## Type Definitions

### `PaymentRequirements`
```typescript
interface PaymentRequirements {
  scheme: 'exact';
  network: StarknetNetwork;
  maxAmountRequired: string;
  asset: string;           // Token contract address
  payTo: string;           // Recipient address
  resource: string;        // Protected resource URL
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
}
```

### `PaymentPayload`
```typescript
interface PaymentPayload {
  x402Version: 1;
  scheme: 'exact';
  network: StarknetNetwork;
  payload: {
    signature: Signature;
    authorization: PaymentAuthorization;
  };
}
```

### `VerifyResponse`
```typescript
interface VerifyResponse {
  isValid: boolean;
  invalidReason?: InvalidPaymentReason;
  payer: string;
  details?: {
    balance?: string;
    nonceUsed?: boolean;
    timestamp?: number;
  };
}
```

## Building Applications

This library is designed to be used by applications. For a complete implementation example, see:

**[voyager-x402](https://github.com/yourusername/voyager-x402)** - Reference implementation with:
- Client application (browser wallet integration)
- Server/facilitator (HTTP endpoints)
- Example integrations

## Paymaster Configuration

AVNU Paymaster endpoints (SNIP-29 compatible):

- **Mainnet**: `https://starknet.paymaster.avnu.fi`
- **Sepolia**: `https://sepolia.paymaster.avnu.fi`

```typescript
import { createPaymasterClient, DEFAULT_PAYMASTER_ENDPOINTS } from '@x402/starknet';

const client = createPaymasterClient({
  endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'],
  network: 'starknet-sepolia',
  apiKey: 'your-api-key' // Optional, for sponsored mode
});
```

**Note**: API keys can be obtained from [AVNU Dashboard](https://app.avnu.fi).

## Development Status

**Current Phase**: Phase 2 Complete ✅

- [x] Core types and validation schemas
- [x] Network configuration
- [x] Utility functions (provider, token, encoding)
- [x] Payment function implementation
- [x] Paymaster integration (AVNU)
- [ ] Full verification/settlement logic (Phase 3-4)
- [ ] Application implementation (in voyager-x402)

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for complete roadmap.

## Development

### Setup
```bash
git clone https://github.com/yourusername/x402-starknet.git
cd x402-starknet
bun install
```

### Commands
```bash
bun run build        # Build TypeScript
bun run typecheck    # Type checking
bun run lint         # Lint code
bun run format       # Format code
bun run test         # Run tests (Phase 6)
```

## Network Support

| Network | Chain ID | Status |
|---------|----------|--------|
| Starknet Mainnet | `0x534e5f4d41494e` | ✅ Configured |
| Starknet Sepolia | `0x534e5f5345504f4c4941` | ✅ Configured |
| Starknet Devnet | `0x534e5f474f45524c49` | ✅ Configured |

## Contributing

Contributions welcome! This is a pure library - application code belongs in separate repos.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Resources

- [x402 Protocol](https://github.com/x402)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Starknet Documentation](https://docs.starknet.io)
- [Starknet.js](https://www.starknetjs.com/)

---

**Version**: 0.1.0 | **Status**: 🚧 Under Development | **Phase**: 1 of 10
