/**
 * Provider utilities
 */

import { RpcProvider } from 'starknet';
import type { StarknetNetwork } from '../types/index.js';
import { getNetworkConfig } from '../networks/index.js';

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
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
