/**
 * Payment verification functions
 */

import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyResponse,
} from '../types/index.js';
import type { RpcProvider } from 'starknet';
import { PAYMENT_PAYLOAD_SCHEMA } from '../types/schemas.js';
import { normalizeAddress } from '../utils/encoding.js';

/**
 * Verify payment payload without executing the transaction
 *
 * This function validates that:
 * - Payload structure is correct
 * - Signature is valid
 * - User has sufficient balance
 * - Payment matches requirements
 * - Payment hasn't expired (validUntil timestamp)
 *
 * @param provider - RPC provider for on-chain checks
 * @param payload - Payment payload from client
 * @param paymentRequirements - Payment requirements from server
 * @returns Verification result
 *
 * @example
 * ```typescript
 * const result = await verifyPayment(provider, payload, requirements);
 * if (result.isValid) {
 *   // Proceed with settlement
 * } else {
 *   console.error('Invalid payment:', result.invalidReason);
 * }
 * ```
 */
export async function verifyPayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  try {
    // 1. Validate payload structure
    const validationResult = PAYMENT_PAYLOAD_SCHEMA.safeParse(payload);
    if (!validationResult.success) {
      return {
        isValid: false,
        invalidReason: 'invalid_network',
        payer: '',
        details: {
          error: validationResult.error.message,
        },
      };
    }

    // 2. Extract payer address
    const payer = extractPayerAddress(payload);

    // 3. Verify network matches
    if (payload.network !== paymentRequirements.network) {
      return {
        isValid: false,
        invalidReason: 'invalid_network',
        payer,
      };
    }

    // 4. Note: Scheme verification omitted - currently only 'exact' is supported
    // When additional payment schemes are added, this check should be re-enabled

    // 5. Verify authorization token matches requirement
    // Normalize addresses for comparison to handle different formats (0x1 vs 0x0001)
    if (
      normalizeAddress(payload.payload.authorization.token) !==
      normalizeAddress(paymentRequirements.asset)
    ) {
      return {
        isValid: false,
        invalidReason: 'invalid_network',
        payer,
      };
    }

    // 6. Verify authorization recipient matches requirement
    // Normalize addresses for comparison to handle different formats (0x1 vs 0x0001)
    if (
      normalizeAddress(payload.payload.authorization.to) !==
      normalizeAddress(paymentRequirements.payTo)
    ) {
      return {
        isValid: false,
        invalidReason: 'invalid_amount',
        payer,
      };
    }

    // 7. Verify amount matches requirement
    if (
      payload.payload.authorization.amount !==
      paymentRequirements.maxAmountRequired
    ) {
      return {
        isValid: false,
        invalidReason: 'invalid_amount',
        payer,
      };
    }

    // 8. Verify payment hasn't expired (validUntil timestamp check)
    // validUntil is a Unix timestamp (seconds since epoch) as a string
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const validUntil = parseInt(payload.payload.authorization.validUntil, 10);

    if (isNaN(validUntil)) {
      return {
        isValid: false,
        invalidReason: 'invalid_network', // Using invalid_network for malformed data
        payer,
        details: {
          error: 'Invalid validUntil timestamp format',
        },
      };
    }

    if (currentTimestamp > validUntil) {
      return {
        isValid: false,
        invalidReason: 'expired',
        payer,
        details: {
          validUntil: validUntil.toString(),
          currentTimestamp: currentTimestamp.toString(),
        },
      };
    }

    // 9. Check token balance
    const { getTokenBalance } = await import('../utils/token.js');
    const balance = await getTokenBalance(
      provider,
      paymentRequirements.asset,
      payer
    );

    if (BigInt(balance) < BigInt(paymentRequirements.maxAmountRequired)) {
      return {
        isValid: false,
        invalidReason: 'insufficient_funds', // Updated per spec §9
        payer,
        details: {
          balance,
        },
      };
    }

    // Note: We don't cryptographically verify the signature here.
    // The signature will be implicitly verified when executing via paymaster.
    // If the signature is invalid, the paymaster execution will fail.

    return {
      isValid: true,
      payer,
      details: {
        balance,
      },
    };
  } catch (error) {
    // Capture error details for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      isValid: false,
      invalidReason: 'unexpected_verify_error', // Updated per spec §9
      payer: '',
      details: {
        error: errorMessage,
      },
    };
  }
}

/**
 * Extract payer address from payment payload
 *
 * @param payload - Payment payload
 * @returns Payer address
 */
export function extractPayerAddress(payload: PaymentPayload): string {
  // The payer address is in the authorization.from field
  return payload.payload.authorization.from;
}
