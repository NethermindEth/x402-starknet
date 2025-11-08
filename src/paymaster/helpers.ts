/**
 * Helper functions for paymaster integration
 */

import type { Call } from 'starknet';
import type {
  PaymasterFeeMode,
  BuildTransactionResponse,
} from '../types/paymaster.js';
import type { PaymasterClient } from './client.js';

/**
 * Build a transaction for user to sign
 *
 * This is a simplified wrapper around paymaster_buildTransaction
 * for the common case of invoking calls.
 *
 * @param client - Paymaster client
 * @param userAddress - User's account address
 * @param calls - Calls to execute
 * @param feeMode - Fee mode (sponsored or default with gas token)
 * @returns Build transaction response with typed data
 *
 * @example
 * ```typescript
 * const result = await buildTransaction(
 *   client,
 *   '0x1234...',
 *   [{ to: tokenAddress, selector: 'transfer', calldata: [...] }],
 *   { mode: 'sponsored' }
 * );
 *
 * // User signs the typed_data
 * const signature = await account.signMessage(result.typed_data);
 * ```
 */
export async function buildTransaction(
  client: PaymasterClient,
  userAddress: string,
  calls: Call[],
  feeMode: PaymasterFeeMode
): Promise<BuildTransactionResponse> {
  return client.buildTransaction({
    transaction: {
      type: 'invoke',
      invoke: {
        user_address: userAddress,
        calls,
      },
    },
    parameters: {
      version: '0x1',
      fee_mode: feeMode,
    },
  });
}

/**
 * Execute a pre-built transaction
 *
 * @param client - Paymaster client
 * @param userAddress - User's account address
 * @param calls - Calls to execute (same as in buildTransaction)
 * @param feeMode - Fee mode (same as in buildTransaction)
 * @param signature - User's signature over typed data
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const result = await executeTransaction(
 *   client,
 *   '0x1234...',
 *   [{ to: tokenAddress, selector: 'transfer', calldata: [...] }],
 *   { mode: 'sponsored' },
 *   signature
 * );
 *
 * console.log('Transaction hash:', result.transaction_hash);
 * ```
 */
export async function executeTransaction(
  client: PaymasterClient,
  userAddress: string,
  calls: Call[],
  feeMode: PaymasterFeeMode,
  signature: string[]
) {
  return client.executeTransaction({
    transaction: {
      type: 'invoke',
      invoke: {
        user_address: userAddress,
        calls,
      },
    },
    parameters: {
      version: '0x1',
      fee_mode: feeMode,
    },
    signature,
  });
}

/**
 * Create transfer call for ERC20 token
 *
 * @param tokenAddress - Token contract address
 * @param recipient - Recipient address
 * @param amount - Amount to transfer (u256 low, high = 0 for most cases)
 * @returns Call object
 *
 * @example
 * ```typescript
 * const transferCall = createTransferCall(
 *   '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
 *   '0x1234...',
 *   '1000000' // 1 token with 6 decimals
 * );
 * ```
 */
export function createTransferCall(
  tokenAddress: string,
  recipient: string,
  amount: string
): Call {
  return {
    contractAddress: tokenAddress,
    entrypoint: 'transfer',
    calldata: [
      recipient, // recipient
      amount, // amount low (u256)
      '0', // amount high (u256)
    ],
  };
}

/**
 * Extract typed data from build response
 *
 * @param response - Build transaction response
 * @returns Typed data for signing
 */
export function extractTypedData(response: BuildTransactionResponse) {
  if (response.type === 'invoke') {
    return response.typed_data;
  }
  if (response.type === 'deploy_and_invoke') {
    return response.typed_data;
  }
  throw new Error('No typed data in deploy-only transaction');
}

/**
 * Default paymaster endpoints by network
 *
 * Note: The old endpoints (starknet.api.avnu.fi) are deprecated.
 * Use these SNIP-29 compatible endpoints instead.
 *
 * @see https://doc.avnu.fi/avnu-paymaster/cover-your-users-gas-fees
 */
export const DEFAULT_PAYMASTER_ENDPOINTS = {
  'starknet-mainnet': 'https://starknet.paymaster.avnu.fi',
  'starknet-sepolia': 'https://sepolia.paymaster.avnu.fi',
  'starknet-devnet': 'http://localhost:5555', // Local paymaster for testing
} as const;
