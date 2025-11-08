/**
 * Payment type definitions for Starknet x402
 */

import type { StarknetNetwork } from './network.js';

/**
 * Payment scheme type
 * Currently only "exact" is supported
 */
export type PaymentScheme = 'exact';

/**
 * Signature structure for Starknet
 */
export interface Signature {
  /** r component of signature (felt252) */
  r: string;
  /** s component of signature (felt252) */
  s: string;
}

/**
 * Payment authorization structure
 */
export interface PaymentAuthorization {
  /** Payer address (felt252) */
  from: string;
  /** Recipient address (felt252) */
  to: string;
  /** Payment amount (u256 as string) */
  amount: string;
  /** Token contract address (felt252) */
  token: string;
  /** Nonce for replay protection (felt252) */
  nonce: string;
  /** Expiry timestamp (Unix timestamp in seconds) */
  validUntil: string;
}

/**
 * Payment requirements sent by server
 */
export interface PaymentRequirements {
  /** Payment scheme */
  scheme: PaymentScheme;
  /** Network identifier */
  network: StarknetNetwork;
  /** Maximum amount required (u256 as string, in token's smallest unit) */
  maxAmountRequired: string;
  /** Token contract address (felt252) */
  asset: string;
  /** Recipient address (felt252) */
  payTo: string;
  /** Protected resource URL */
  resource: string;
  /** Human-readable description of what payment is for */
  description?: string;
  /** MIME type of the resource */
  mimeType?: string;
  /** Maximum timeout in seconds for payment settlement */
  maxTimeoutSeconds?: number;
  /** Additional scheme-specific data */
  extra?: {
    /** Token name (e.g., "USD Coin") */
    tokenName?: string;
    /** Token symbol (e.g., "USDC") */
    tokenSymbol?: string;
    /** Token decimals (e.g., 6 for USDC) */
    tokenDecimals?: number;
    /** Payment contract address for settlement */
    paymentContract?: string;
  };
}

/**
 * Payment payload created by client
 */
export interface PaymentPayload {
  /** x402 protocol version */
  x402Version: 1;
  /** Payment scheme */
  scheme: PaymentScheme;
  /** Network identifier */
  network: StarknetNetwork;
  /** Payment details */
  payload: {
    /** Signature over the authorization */
    signature: Signature;
    /** Authorization details */
    authorization: PaymentAuthorization;
  };
}

/**
 * Payment requirements response from server (402 response)
 */
export interface PaymentRequirementsResponse {
  /** x402 protocol version */
  x402Version: 1;
  /** Array of payment options */
  paymentRequirements: PaymentRequirements[];
}

/**
 * Payment requirements selector function type
 */
export type PaymentRequirementsSelector = (
  requirements: PaymentRequirements[]
) => Promise<PaymentRequirements> | PaymentRequirements;
