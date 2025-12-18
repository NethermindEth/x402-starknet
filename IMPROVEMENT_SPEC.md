# x402-starknet Improvement Specification

This document outlines improvements to the x402-starknet package to reduce duplication across consuming projects and provide a more complete, batteries-included experience for Starknet x402 payment integration.

## Background

After migrating the Voyager x402 facilitator to v2-only (CAIP-2 networks), we identified several areas where x402-starknet could export utilities that are currently duplicated in consuming projects:

- Zod validation schemas (type-safe parsing)
- Network constants and utilities
- Token contract addresses
- Provider factory functions
- Paymaster configuration helpers

## 1. Zod Validation Schemas

### Problem

Consuming projects need to validate incoming payment payloads and requirements. Currently, they must create their own Zod schemas and then cast to x402-starknet types:

```typescript
// Current approach in facilitator
const validatedPayload = localPaymentPayloadSchema.parse(rawPaymentPayload);
paymentPayload = validatedPayload as unknown as X402StarknetPaymentPayload;
```

This is error-prone and requires maintaining duplicate schema definitions.

### Solution

Export Zod schemas directly from x402-starknet:

```typescript
// src/schemas/index.ts
import { z } from 'zod';
import type { PaymentPayload, PaymentRequirements } from '../types';

/**
 * Zod schema for PaymentRequirements validation
 */
export const PaymentRequirementsSchema = z.object({
  x402Version: z.literal(2),
  scheme: z.literal('exact'),
  network: z.string().regex(/^starknet:(SN_MAIN|SN_SEPOLIA)$/),
  amount: z.string(),
  asset: z.string(),
  payTo: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive(),
  outputSchema: z.record(z.unknown()).nullable().optional(),
}) satisfies z.ZodType<PaymentRequirements>;

/**
 * Zod schema for Authorization validation
 */
export const AuthorizationSchema = z.object({
  from: z.string(),
  nonce: z.string(),
  signature: z.array(z.string()),
  validAfter: z.number(),
  validBefore: z.number(),
});

/**
 * Zod schema for PaymentPayload validation
 */
export const PaymentPayloadSchema = z.object({
  x402Version: z.literal(2),
  scheme: z.literal('exact'),
  network: z.string().regex(/^starknet:(SN_MAIN|SN_SEPOLIA)$/),
  payload: z.object({
    signature: z.array(z.string()),
    authorization: AuthorizationSchema,
  }),
  accepted: PaymentRequirementsSchema,
}) satisfies z.ZodType<PaymentPayload>;

export type { PaymentPayload, PaymentRequirements };
```

### Export from index.ts

```typescript
// Add to src/index.ts
export {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  AuthorizationSchema,
} from './schemas';
```

### Usage

```typescript
import {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  type PaymentPayload,
} from 'x402-starknet';

// Parse and validate - result is properly typed
const paymentPayload: PaymentPayload = PaymentPayloadSchema.parse(rawPayload);
```

---

## 2. Network Constants & Utilities

### Problem

Consuming projects define their own Starknet network constants and type guards:

```typescript
// Duplicated in every project
export const STARKNET_NETWORKS = ["starknet:SN_MAIN", "starknet:SN_SEPOLIA"] as const;
export type StarknetNetwork = (typeof STARKNET_NETWORKS)[number];
export function isStarknetNetwork(network: string): network is StarknetNetwork { ... }
```

### Solution

Export network constants and utilities from x402-starknet:

```typescript
// src/networks/index.ts

/**
 * Supported Starknet networks in CAIP-2 format
 */
export const STARKNET_NETWORKS = [
  'starknet:SN_MAIN',
  'starknet:SN_SEPOLIA',
] as const;

export type StarknetNetwork = (typeof STARKNET_NETWORKS)[number];

/**
 * Network references for Starknet.js compatibility
 */
export const NETWORK_REFERENCES: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN': 'SN_MAIN',
  'starknet:SN_SEPOLIA': 'SN_SEPOLIA',
};

/**
 * Human-readable network names
 */
export const NETWORK_NAMES: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN': 'Starknet Mainnet',
  'starknet:SN_SEPOLIA': 'Starknet Sepolia',
};

/**
 * Check if a string is a valid Starknet network identifier
 */
export function isStarknetNetwork(network: string): network is StarknetNetwork {
  return (STARKNET_NETWORKS as readonly string[]).includes(network);
}

/**
 * Parse a CAIP-2 Starknet network identifier
 * @throws Error if not a valid Starknet CAIP-2 identifier
 */
export function parseStarknetNetwork(caip2: string): {
  namespace: 'starknet';
  reference: string;
} {
  if (!caip2.startsWith('starknet:')) {
    throw new Error(`Invalid Starknet CAIP-2 identifier: ${caip2}`);
  }
  const reference = caip2.slice(9); // Remove "starknet:" prefix
  if (!reference) {
    throw new Error(`Invalid Starknet CAIP-2 identifier: ${caip2}`);
  }
  return { namespace: 'starknet', reference };
}

/**
 * Build a CAIP-2 identifier from a Starknet network reference
 */
export function buildStarknetCAIP2(
  reference: 'SN_MAIN' | 'SN_SEPOLIA'
): StarknetNetwork {
  return `starknet:${reference}` as StarknetNetwork;
}

/**
 * Get the Starknet.js network reference from a CAIP-2 identifier
 */
export function getNetworkReference(network: StarknetNetwork): string {
  return NETWORK_REFERENCES[network];
}

/**
 * Validate and return network, or throw
 */
export function validateNetwork(network: string): StarknetNetwork {
  if (!isStarknetNetwork(network)) {
    throw new Error(
      `Unsupported Starknet network: ${network}. ` +
        `Supported: ${STARKNET_NETWORKS.join(', ')}`
    );
  }
  return network;
}
```

---

## 3. Token Contract Addresses

### Problem

Every consuming project hardcodes token addresses:

```typescript
// Duplicated everywhere
const USDC_SEPOLIA =
  '0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080';
const USDC_MAINNET =
  '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
```

### Solution

Export canonical token addresses:

```typescript
// src/tokens/index.ts
import type { StarknetNetwork } from '../networks';

/**
 * Token symbol type
 */
export type TokenSymbol = 'USDC' | 'ETH' | 'STRK';

/**
 * USDC contract addresses by network
 * USDC uses 6 decimals on Starknet
 */
export const USDC_ADDRESSES: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN':
    '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
  'starknet:SN_SEPOLIA':
    '0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080',
};

/**
 * ETH contract addresses by network
 * ETH uses 18 decimals on Starknet
 */
export const ETH_ADDRESSES: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN':
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  'starknet:SN_SEPOLIA':
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
};

/**
 * STRK contract addresses by network
 * STRK uses 18 decimals on Starknet
 */
export const STRK_ADDRESSES: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN':
    '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  'starknet:SN_SEPOLIA':
    '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
};

/**
 * Token decimals
 */
export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  USDC: 6,
  ETH: 18,
  STRK: 18,
};

/**
 * All token addresses indexed by symbol and network
 */
export const TOKEN_ADDRESSES: Record<
  TokenSymbol,
  Record<StarknetNetwork, string>
> = {
  USDC: USDC_ADDRESSES,
  ETH: ETH_ADDRESSES,
  STRK: STRK_ADDRESSES,
};

/**
 * Get token address for a network
 */
export function getTokenAddress(
  symbol: TokenSymbol,
  network: StarknetNetwork
): string {
  return TOKEN_ADDRESSES[symbol][network];
}

/**
 * Get token decimals
 */
export function getTokenDecimals(symbol: TokenSymbol): number {
  return TOKEN_DECIMALS[symbol];
}

/**
 * Convert human-readable amount to atomic units
 */
export function toAtomicUnits(amount: number, symbol: TokenSymbol): string {
  const decimals = TOKEN_DECIMALS[symbol];
  const atomicUnits = Math.floor(amount * 10 ** decimals);
  return String(atomicUnits);
}

/**
 * Convert atomic units to human-readable amount
 */
export function fromAtomicUnits(
  atomicUnits: string,
  symbol: TokenSymbol
): number {
  const decimals = TOKEN_DECIMALS[symbol];
  return Number(atomicUnits) / 10 ** decimals;
}

/**
 * Identify token symbol from address (case-insensitive)
 */
export function getTokenSymbol(
  address: string,
  network: StarknetNetwork
): TokenSymbol | undefined {
  const normalizedAddress = address.toLowerCase();
  for (const [symbol, addresses] of Object.entries(TOKEN_ADDRESSES)) {
    if (addresses[network].toLowerCase() === normalizedAddress) {
      return symbol as TokenSymbol;
    }
  }
  return undefined;
}
```

---

## 4. Provider Factory

### Problem

Projects create RpcProvider instances with varying patterns:

```typescript
// Inconsistent provider creation
const provider = new RpcProvider({ nodeUrl: someUrl });
```

### Solution

Export a provider factory with sensible defaults:

````typescript
// src/provider/index.ts
import { RpcProvider, constants } from 'starknet';
import {
  type StarknetNetwork,
  getNetworkReference,
  validateNetwork,
} from '../networks';

/**
 * Default public RPC endpoints (rate-limited, use your own for production)
 */
export const DEFAULT_RPC_URLS: Record<StarknetNetwork, string> = {
  'starknet:SN_MAIN': 'https://starknet-mainnet.public.blastapi.io',
  'starknet:SN_SEPOLIA': 'https://starknet-sepolia.public.blastapi.io',
};

/**
 * Provider configuration options
 */
export interface ProviderOptions {
  /** Custom RPC URL (overrides default) */
  rpcUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional headers for RPC requests */
  headers?: Record<string, string>;
}

/**
 * Create an RpcProvider for a Starknet network
 *
 * @param network - CAIP-2 network identifier
 * @param options - Provider configuration options
 * @returns Configured RpcProvider instance
 *
 * @example
 * ```typescript
 * // Using default public RPC
 * const provider = createProvider("starknet:SN_SEPOLIA");
 *
 * // Using custom RPC URL
 * const provider = createProvider("starknet:SN_MAIN", {
 *   rpcUrl: "https://your-rpc-endpoint.com",
 * });
 * ```
 */
export function createProvider(
  network: StarknetNetwork | string,
  options: ProviderOptions = {}
): RpcProvider {
  const validatedNetwork = validateNetwork(network);
  const nodeUrl = options.rpcUrl ?? DEFAULT_RPC_URLS[validatedNetwork];

  return new RpcProvider({
    nodeUrl,
    ...(options.headers && { headers: options.headers }),
  });
}

/**
 * Get the Starknet.js chain ID constant for a network
 */
export function getChainId(
  network: StarknetNetwork
): constants.StarknetChainId {
  switch (network) {
    case 'starknet:SN_MAIN':
      return constants.StarknetChainId.SN_MAIN;
    case 'starknet:SN_SEPOLIA':
      return constants.StarknetChainId.SN_SEPOLIA;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}
````

---

## 5. Paymaster Configuration

### Problem

Projects manually construct paymaster configuration objects:

```typescript
// Complex manual configuration
const result = await settleStarknet(
  provider,
  paymentPayload,
  paymentRequirements,
  paymasterEndpoint
    ? {
        paymasterConfig: {
          endpoint: paymasterEndpoint,
          network,
          ...(paymasterApiKey ? { apiKey: paymasterApiKey } : {}),
        },
      }
    : undefined
);
```

### Solution

Export paymaster configuration helpers:

````typescript
// src/paymaster/index.ts
import type { StarknetNetwork } from '../networks';

/**
 * Paymaster configuration for sponsored transactions
 */
export interface PaymasterConfig {
  /** Paymaster service endpoint URL */
  endpoint: string;
  /** Target network */
  network: StarknetNetwork;
  /** API key for authenticated requests */
  apiKey?: string;
}

/**
 * Settlement options including paymaster configuration
 */
export interface SettlementOptions {
  paymasterConfig?: PaymasterConfig;
}

/**
 * Known paymaster endpoints
 */
export const AVNU_PAYMASTER_ENDPOINTS: Partial<
  Record<StarknetNetwork, string>
> = {
  'starknet:SN_MAIN': 'https://starknet.paymaster.avnu.fi',
  'starknet:SN_SEPOLIA': 'https://sepolia.paymaster.avnu.fi',
};

/**
 * Create paymaster configuration
 *
 * @param network - Target network
 * @param endpoint - Paymaster endpoint URL (uses AVNU default if not provided)
 * @param apiKey - Optional API key
 * @returns PaymasterConfig object
 *
 * @example
 * ```typescript
 * // Using AVNU paymaster with default endpoint
 * const config = createPaymasterConfig("starknet:SN_SEPOLIA");
 *
 * // Using custom paymaster
 * const config = createPaymasterConfig("starknet:SN_MAIN", {
 *   endpoint: "http://localhost:12777",
 *   apiKey: "your-api-key",
 * });
 * ```
 */
export function createPaymasterConfig(
  network: StarknetNetwork,
  options?: {
    endpoint?: string;
    apiKey?: string;
  }
): PaymasterConfig {
  const endpoint = options?.endpoint ?? AVNU_PAYMASTER_ENDPOINTS[network];

  if (!endpoint) {
    throw new Error(
      `No paymaster endpoint available for ${network}. ` +
        `Please provide a custom endpoint.`
    );
  }

  return {
    endpoint,
    network,
    ...(options?.apiKey && { apiKey: options.apiKey }),
  };
}

/**
 * Create settlement options with paymaster configuration
 *
 * @param network - Target network
 * @param paymasterOptions - Paymaster configuration options
 * @returns SettlementOptions object ready for settlePayment()
 */
export function createSettlementOptions(
  network: StarknetNetwork,
  paymasterOptions?: {
    endpoint?: string;
    apiKey?: string;
  }
): SettlementOptions {
  return {
    paymasterConfig: createPaymasterConfig(network, paymasterOptions),
  };
}

/**
 * Check if a network has a known public paymaster
 */
export function hasPublicPaymaster(network: StarknetNetwork): boolean {
  return network in AVNU_PAYMASTER_ENDPOINTS;
}
````

---

## 6. Payment Builder Utilities

### Problem

Building payment requirements objects requires knowing the exact structure:

```typescript
// Manual construction
const requirement = {
  x402Version: 2,
  scheme: 'exact',
  network: 'starknet:SN_SEPOLIA',
  amount: '1000000',
  asset: '0x053b40...',
  payTo: '0x...',
  // ... more fields
};
```

### Solution

Export builder functions:

````typescript
// src/builders/index.ts
import type { PaymentRequirements } from '../types';
import type { StarknetNetwork } from '../networks';
import { getTokenAddress, toAtomicUnits, type TokenSymbol } from '../tokens';

/**
 * Parameters for building payment requirements
 */
export interface PaymentRequirementsParams {
  /** Target network */
  network: StarknetNetwork;
  /** Payment amount in human-readable units (e.g., 1.50 for $1.50 USDC) */
  amount: number;
  /** Token symbol or contract address */
  asset: TokenSymbol | string;
  /** Recipient address */
  payTo: string;
  /** Human-readable description */
  description?: string;
  /** Response MIME type */
  mimeType?: string;
  /** Maximum timeout in seconds (default: 300) */
  maxTimeoutSeconds?: number;
  /** JSON schema for expected output */
  outputSchema?: Record<string, unknown> | null;
}

/**
 * Build a PaymentRequirements object
 *
 * @param params - Payment requirement parameters
 * @returns Fully-formed PaymentRequirements object
 *
 * @example
 * ```typescript
 * const requirements = buildPaymentRequirements({
 *   network: "starknet:SN_SEPOLIA",
 *   amount: 0.001, // $0.001 USDC
 *   asset: "USDC",
 *   payTo: "0x...",
 *   description: "API access fee",
 * });
 * ```
 */
export function buildPaymentRequirements(
  params: PaymentRequirementsParams
): PaymentRequirements {
  // Resolve asset address
  let assetAddress: string;
  let atomicAmount: string;

  if (
    params.asset === 'USDC' ||
    params.asset === 'ETH' ||
    params.asset === 'STRK'
  ) {
    assetAddress = getTokenAddress(params.asset, params.network);
    atomicAmount = toAtomicUnits(params.amount, params.asset);
  } else {
    // Assume it's a contract address, use raw amount as string
    assetAddress = params.asset;
    atomicAmount = String(params.amount);
  }

  return {
    x402Version: 2,
    scheme: 'exact',
    network: params.network,
    amount: atomicAmount,
    asset: assetAddress,
    payTo: params.payTo,
    description: params.description,
    mimeType: params.mimeType ?? 'application/json',
    maxTimeoutSeconds: params.maxTimeoutSeconds ?? 300,
    outputSchema: params.outputSchema ?? null,
  };
}

/**
 * Parameters for quick USDC payment requirements
 */
export interface USDCPaymentParams {
  network: StarknetNetwork;
  /** Amount in USD (e.g., 0.01 for 1 cent) */
  usdAmount: number;
  payTo: string;
  description?: string;
}

/**
 * Shorthand for building USDC payment requirements
 *
 * @example
 * ```typescript
 * const requirements = buildUSDCPayment({
 *   network: "starknet:SN_SEPOLIA",
 *   usdAmount: 0.001,
 *   payTo: "0x...",
 * });
 * ```
 */
export function buildUSDCPayment(
  params: USDCPaymentParams
): PaymentRequirements {
  return buildPaymentRequirements({
    network: params.network,
    amount: params.usdAmount,
    asset: 'USDC',
    payTo: params.payTo,
    description: params.description,
  });
}
````

---

## 7. Updated Package Exports

Update the main `src/index.ts` to export all new utilities:

```typescript
// src/index.ts

// Core payment functions (existing)
export { createPaymentPayload } from './client';
export { verifyPayment } from './verify';
export { settlePayment } from './settle';

// Types (existing)
export type {
  PaymentPayload,
  PaymentRequirements,
  Authorization,
  VerifyResult,
  SettleResult,
} from './types';

// NEW: Validation schemas
export {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  AuthorizationSchema,
} from './schemas';

// NEW: Network utilities
export {
  STARKNET_NETWORKS,
  NETWORK_REFERENCES,
  NETWORK_NAMES,
  type StarknetNetwork,
  isStarknetNetwork,
  parseStarknetNetwork,
  buildStarknetCAIP2,
  getNetworkReference,
  validateNetwork,
} from './networks';

// NEW: Token utilities
export {
  USDC_ADDRESSES,
  ETH_ADDRESSES,
  STRK_ADDRESSES,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  type TokenSymbol,
  getTokenAddress,
  getTokenDecimals,
  toAtomicUnits,
  fromAtomicUnits,
  getTokenSymbol,
} from './tokens';

// NEW: Provider utilities
export {
  DEFAULT_RPC_URLS,
  type ProviderOptions,
  createProvider,
  getChainId,
} from './provider';

// NEW: Paymaster utilities
export {
  AVNU_PAYMASTER_ENDPOINTS,
  type PaymasterConfig,
  type SettlementOptions,
  createPaymasterConfig,
  createSettlementOptions,
  hasPublicPaymaster,
} from './paymaster';

// NEW: Builder utilities
export {
  type PaymentRequirementsParams,
  type USDCPaymentParams,
  buildPaymentRequirements,
  buildUSDCPayment,
} from './builders';
```

---

## 8. File Structure

Proposed new file structure:

```
src/
├── index.ts              # Main exports
├── client.ts             # createPaymentPayload (existing)
├── verify.ts             # verifyPayment (existing)
├── settle.ts             # settlePayment (existing)
├── types.ts              # Type definitions (existing)
├── schemas/
│   └── index.ts          # Zod validation schemas
├── networks/
│   └── index.ts          # Network constants & utilities
├── tokens/
│   └── index.ts          # Token addresses & utilities
├── provider/
│   └── index.ts          # Provider factory
├── paymaster/
│   └── index.ts          # Paymaster configuration
└── builders/
    └── index.ts          # Payment builder utilities
```

---

## 9. Usage Examples

### Complete Integration Example

```typescript
import {
  // Core functions
  createPaymentPayload,
  verifyPayment,
  settlePayment,
  // Validation
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  // Network utilities
  isStarknetNetwork,
  validateNetwork,
  // Provider
  createProvider,
  // Paymaster
  createSettlementOptions,
  // Builders
  buildUSDCPayment,
} from 'x402-starknet';

// Server: Build payment requirements
const requirements = buildUSDCPayment({
  network: 'starknet:SN_SEPOLIA',
  usdAmount: 0.001,
  payTo: '0x...',
  description: 'API access',
});

// Client: Create payment payload
const payload = await createPaymentPayload(wallet, requirements);

// Server: Validate incoming request
const validatedPayload = PaymentPayloadSchema.parse(rawPayload);
const validatedRequirements = PaymentRequirementsSchema.parse(rawRequirements);

// Server: Create provider and settle
const provider = createProvider(validatedRequirements.network);
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

// Server: Verify payment
const verification = await verifyPayment(
  provider,
  validatedPayload,
  validatedRequirements
);
```

---

## 10. Migration Guide

For projects currently using x402-starknet:

### Before (current)

```typescript
import { settlePayment, type PaymentPayload } from 'x402-starknet';
import { RpcProvider } from 'starknet';

// Manual provider creation
const provider = new RpcProvider({ nodeUrl: env.RPC_URL });

// Manual paymaster config
const options = {
  paymasterConfig: {
    endpoint: env.PAYMASTER_URL,
    network: 'starknet:SN_SEPOLIA',
    apiKey: env.PAYMASTER_API_KEY,
  },
};

// Manual validation with local schemas
const payload = localSchema.parse(raw) as unknown as PaymentPayload;
```

### After (with improvements)

```typescript
import {
  settlePayment,
  PaymentPayloadSchema,
  createProvider,
  createSettlementOptions,
} from 'x402-starknet';

// Provider from factory
const provider = createProvider('starknet:SN_SEPOLIA', { rpcUrl: env.RPC_URL });

// Paymaster config from helper
const options = createSettlementOptions('starknet:SN_SEPOLIA', {
  endpoint: env.PAYMASTER_URL,
  apiKey: env.PAYMASTER_API_KEY,
});

// Direct validation without casting
const payload = PaymentPayloadSchema.parse(raw);
```

---

## Implementation Priority

1. **High Priority** (most impact)
   - Zod validation schemas
   - Network constants & utilities
   - Token addresses

2. **Medium Priority** (convenience)
   - Provider factory
   - Paymaster configuration helpers

3. **Lower Priority** (nice to have)
   - Payment builder utilities
   - Additional convenience functions

---

## Dependencies

New dependencies required:

- `zod` - For validation schemas (likely already a peer dependency)

No other new dependencies needed - all utilities use existing `starknet` package features.
