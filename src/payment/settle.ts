/**
 * Payment settlement functions
 */

import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
} from '../types/index.js';
import type { RpcProvider } from 'starknet';
import { verifyPayment } from './verify.js';

/**
 * Settle payment by executing the transaction
 *
 * This function:
 * - Verifies the payment first
 * - Executes the transaction (via paymaster or direct)
 * - Waits for confirmation
 * - Returns transaction details
 *
 * @param provider - RPC provider
 * @param payload - Payment payload from client
 * @param paymentRequirements - Payment requirements from server
 * @param options - Settlement options (paymaster config, etc.)
 * @returns Settlement result with transaction hash
 *
 * @example
 * ```typescript
 * const result = await settlePayment(
 *   provider,
 *   payload,
 *   requirements,
 *   { paymasterEndpoint: 'https://paymaster.example.com' }
 * );
 *
 * if (result.success) {
 *   console.log('Payment settled:', result.transaction);
 * }
 * ```
 */
export async function settlePayment(
  provider: RpcProvider,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  _options?: {
    paymasterEndpoint?: string;
    [key: string]: unknown;
  }
): Promise<SettleResponse> {
  // 1. Verify payment first
  const verification = await verifyPayment(
    provider,
    payload,
    paymentRequirements
  );

  if (!verification.isValid) {
    const errorReason = verification.invalidReason;
    return {
      success: false,
      ...(errorReason ? { errorReason } : {}),
      transaction: '',
      network: paymentRequirements.network,
      payer: verification.payer,
    };
  }

  try {
    // 2. Execute transaction
    // TODO: Implement settlement logic
    // - Use paymaster if endpoint provided
    // - Otherwise use direct transaction submission

    throw new Error('Not implemented yet - will be added in Phase 4');
  } catch (error) {
    return {
      success: false,
      errorReason: (error as Error).message,
      transaction: '',
      network: paymentRequirements.network,
      payer: verification.payer,
    };
  }
}

/**
 * Wait for transaction to be accepted on L2
 *
 * @param provider - RPC provider
 * @param transactionHash - Transaction hash to wait for
 * @param options - Wait options
 * @returns Transaction receipt
 */
export async function waitForSettlement(
  provider: RpcProvider,
  transactionHash: string,
  options?: {
    retryInterval?: number;
    maxRetries?: number;
  }
) {
  return provider.waitForTransaction(transactionHash, {
    retryInterval: options?.retryInterval ?? 2000,
    successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
  });
}
