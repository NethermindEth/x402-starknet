# @x402/starknet

Starknet implementation of the x402 payment protocol - enabling seamless micropayments on the web.

## Overview

This library implements the [x402 payment protocol](https://github.com/x402) for Starknet, allowing developers to accept micropayments for digital resources using HTTP 402 status codes. Built with TypeScript, Bun, and starknet.js.

## Features

- 🚀 **Simple Integration** - One-line server setup, minimal client code
- 🔗 **Starknet Native** - Full support for Starknet's account abstraction
- 🛡️ **Type Safe** - Complete TypeScript types with Zod runtime validation
- 🌐 **Multi-Network** - Support for mainnet, Sepolia testnet, and local devnet
- 📦 **Modular** - Use only what you need (client, facilitator, types)

## Installation

```bash
bun add @x402/starknet
# or
npm install @x402/starknet
# or
pnpm add @x402/starknet
```

## Quick Start

### Client Usage

```typescript
import { createPaymentHeader } from '@x402/starknet/client';
import { Account, RpcProvider } from 'starknet';

// Connect to your Starknet account
const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' });
const account = new Account(provider, accountAddress, privateKey);

// Create a payment header
const paymentHeader = await createPaymentHeader(
  account,
  1, // x402 version
  paymentRequirements // from server's 402 response
);

// Use the payment header in your request
const response = await fetch(resourceUrl, {
  headers: {
    'X-PAYMENT': paymentHeader,
  },
});
```

### Server Usage (Coming Soon)

```typescript
import { paymentMiddleware } from '@x402/starknet/server';

// Protect your endpoints with payment requirements
app.use(paymentMiddleware({
  payTo: '0x1234...', // Your recipient address
  routes: {
    '/api/data': '1000000', // 1 USDC (6 decimals)
  },
}));
```

## Project Status

**Current Phase**: Foundation (Phase 1) ✅

- [x] Project setup with Bun and TypeScript
- [x] Core type definitions
- [x] Network configuration
- [x] Zod validation schemas
- [ ] Client implementation (Phase 3)
- [ ] Facilitator implementation (Phase 4)
- [ ] Cairo smart contracts (Phase 2)

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete roadmap.

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Node.js >= 18.0.0 (optional)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/x402-starknet.git
cd x402-starknet

# Install dependencies
bun install

# Build the project
bun run build

# Run type checking
bun run typecheck

# Run linting
bun run lint

# Format code
bun run format
```

### Scripts

- `bun run build` - Build TypeScript to JavaScript
- `bun run test` - Run tests (coming soon)
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Lint source files
- `bun run format` - Format code with Prettier
- `bun run clean` - Remove build artifacts

## Architecture

This library follows the x402 protocol's three-layer architecture:

### 1. Types Layer (✅ Complete)
Transport and scheme-agnostic data structures:
- `PaymentRequirements` - Server payment request
- `PaymentPayload` - Client signed authorization
- `SettlementResponse` - Transaction confirmation

### 2. Logic Layer (🚧 In Progress)
Starknet-specific verification and settlement:
- Signature verification using STARK curves
- Balance checking and nonce management
- Cairo contract interaction

### 3. Representation Layer (📋 Planned)
HTTP transport implementation:
- 402 status code handling
- `X-PAYMENT` header processing
- `X-PAYMENT-RESPONSE` confirmation

## Network Support

| Network | Status | Chain ID | RPC URL |
|---------|--------|----------|---------|
| Starknet Mainnet | ✅ Configured | `0x534e5f4d41494e` | `https://starknet-mainnet.public.blastapi.io` |
| Starknet Sepolia | ✅ Configured | `0x534e5f5345504f4c4941` | `https://starknet-sepolia.public.blastapi.io` |
| Starknet Devnet | ✅ Configured | `0x534e5f474f45524c49` | `http://localhost:5050` |

## API Documentation

### Types

```typescript
import type {
  StarknetNetwork,
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
} from '@x402/starknet/types';
```

### Networks

```typescript
import {
  getNetworkConfig,
  getNetworkFromChainId,
  isTestnet,
  getSupportedNetworks,
  NETWORK_CONFIGS,
} from '@x402/starknet/networks';

// Get network configuration
const config = getNetworkConfig('starknet-sepolia');
console.log(config.rpcUrl); // https://starknet-sepolia.public.blastapi.io

// Check if network is testnet
console.log(isTestnet('starknet-sepolia')); // true
```

For complete API documentation, see [API.md](./docs/API.md) (coming soon).

## Key Differences from EVM/Solana x402

### 1. No EIP-3009 on Starknet
Instead of EIP-3009's `transferWithAuthorization`, we use a custom Cairo contract that implements similar functionality with Starknet's native account abstraction.

### 2. Different Signature Scheme
- EVM uses ECDSA secp256k1 with EIP-712
- Starknet uses STARK-friendly curves with structured hashing

### 3. Account Abstraction
All Starknet accounts are smart contracts, providing greater flexibility but requiring different integration patterns.

### 4. Token Standards
No USDC with EIP-3009 on Starknet. We work with standard ERC20-like tokens or custom payment tokens.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines (coming soon).

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Resources

- [x402 Protocol Specification](https://github.com/x402/specs)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Starknet.js Documentation](https://www.starknetjs.com/)
- [Cairo Book](https://book.cairo-lang.org/)
- [Starknet Documentation](https://docs.starknet.io/)

## Acknowledgments

- Original x402 protocol: [x402 GitHub](https://github.com/x402)
- Starknet.js team for the excellent Starknet library
- Starknet ecosystem for Cairo and tooling

---

**Status**: 🚧 Under Development | **Phase**: 1 of 10 | **Version**: 0.1.0
