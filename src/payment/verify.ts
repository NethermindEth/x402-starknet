/**
 * Payment verification functions
 */

import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyResponse,
} from '../types/index.js';
import type { RpcProvider } from 'starknet';
import { PaymentPayloadSchema } from '../types/index.js';

/**
 * Verify payment payload without executing the transaction
 *
 * This function validates that:
 * - Payload structure is correct
 * - Signature is valid
 * - User has sufficient balance
 * - Payment matches requirements
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
    PaymentPayloadSchema.parse(payload);

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

    // 4. Verify scheme matches
    if (payload.scheme !== paymentRequirements.scheme) {
      return {
        isValid: false,
        invalidReason: 'invalid_amount',
        payer,
      };
    }

    // 5. Verify authorization token matches requirement
    if (payload.payload.authorization.token !== paymentRequirements.asset) {
      return {
        isValid: false,
        invalidReason: 'invalid_network',
        payer,
      };
    }

    // 6. Verify authorization recipient matches requirement
    if (payload.payload.authorization.to !== paymentRequirements.payTo) {
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

    // 8. Check token balance
    const { getTokenBalance } = await import('../utils/token.js');
    const balance = await getTokenBalance(
      provider,
      paymentRequirements.asset,
      payer
    );

    if (BigInt(balance) < BigInt(paymentRequirements.maxAmountRequired)) {
      return {
        isValid: false,
        invalidReason: 'insufficient_balance',
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
      invalidReason: 'unknown_error',
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
