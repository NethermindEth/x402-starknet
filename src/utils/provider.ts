/**
 * Provider utilities
 */

import { RpcProvider } from 'starknet';
import type { StarknetNetwork } from '../types/index.js';
import { getNetworkConfig } from '../networks/index.js';
import { err, wrapUnknown } from '../errors.js';

/**
 * Create RPC provider for a network
 *
 * @param network - Network identifier
 * @returns Configured RPC provider
 *
 * @example
 * ```typescript
 * const provider = createProvider('starknet-sepolia');
 * ```
 */
export function createProvider(network: StarknetNetwork): RpcProvider {
  const config = getNetworkConfig(network);
  return new RpcProvider({ nodeUrl: config.rpcUrl });
}

/**
 * Retry an RPC call with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of the function
 */
export async function retryRpcCall<T>(
  function_: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let index = 0; index < maxRetries; index++) {
    try {
      return await function_();
    } catch (error) {
      lastError = error;
      if (index < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, index);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError
    ? wrapUnknown(lastError, 'ENETWORK', 'RPC call failed after all retries')
    : err.network('RPC call failed after all retries');
}
