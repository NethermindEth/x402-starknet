/**
 * Payment creation functions
 */

import type {
  PaymentRequirements,
  PaymentPayload,
  PaymentRequirementsSelector,
} from '../types/index.js';
import type { Account, RpcProvider } from 'starknet';

/**
 * Select appropriate payment requirements from available options
 *
 * @param requirements - Array of payment requirement options
 * @param account - User's account
 * @param provider - RPC provider for balance checks
 * @returns Selected payment requirements
 * @throws Error if no requirements can be satisfied
 *
 * @example
 * ```typescript
 * const selected = await selectPaymentRequirements(
 *   requirements,
 *   account,
 *   provider
 * );
 * ```
 */
export async function selectPaymentRequirements(
  requirements: PaymentRequirements[],
  _account: Account,
  _provider: RpcProvider
): Promise<PaymentRequirements> {
  // Filter by network compatibility
  const compatible = requirements.filter((_req) => {
    // Network matching logic here
    // TODO: Check network matches provider
    return true; // Placeholder
  });

  if (compatible.length === 0) {
    throw new Error('No compatible payment requirements found');
  }

  // Return first compatible option
  // TODO: Add balance checking
  return compatible[0] as PaymentRequirements;
}

/**
 * Custom selector type for payment requirements
 */
export type { PaymentRequirementsSelector };

/**
 * Create payment payload for x402 request
 *
 * This is the core function that applications will use to create
 * payment authorizations. The actual implementation will depend on
 * whether using paymaster or other methods.
 *
 * @param account - User's Starknet account
 * @param x402Version - x402 protocol version (currently 1)
 * @param paymentRequirements - Payment requirements from server
 * @param options - Additional options (paymaster config, etc.)
 * @returns Payment payload to send to server
 *
 * @example
 * ```typescript
 * const payload = await createPaymentPayload(
 *   account,
 *   1,
 *   paymentRequirements,
 *   { paymasterEndpoint: 'https://paymaster.example.com' }
 * );
 * ```
 */
export async function createPaymentPayload(
  _account: Account,
  _x402Version: number,
  _paymentRequirements: PaymentRequirements,
  _options?: {
    paymasterEndpoint?: string;
    [key: string]: unknown;
  }
): Promise<PaymentPayload> {
  // TODO: Implement payment payload creation
  // This will use paymaster integration when available
  throw new Error('Not implemented yet - will be added in Phase 2');
}

/**
 * Encode payment payload to base64 string for X-PAYMENT header
 *
 * @param payload - Payment payload to encode
 * @returns Base64-encoded string
 *
 * @example
 * ```typescript
 * const header = encodePaymentHeader(payload);
 * // Use in HTTP request:
 * // headers: { 'X-PAYMENT': header }
 * ```
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64');
}

/**
 * Decode payment payload from base64 X-PAYMENT header
 *
 * @param encoded - Base64-encoded payment header
 * @returns Decoded payment payload
 *
 * @example
 * ```typescript
 * const payload = decodePaymentHeader(req.headers['x-payment']);
 * ```
 */
export function decodePaymentHeader(encoded: string): PaymentPayload {
  const json = Buffer.from(encoded, 'base64').toString('utf-8');
  return JSON.parse(json) as PaymentPayload;
}
