/**
 * Network configuration and utilities for Starknet x402
 * @module networks
 */

import type { NetworkConfig, StarknetNetwork } from '../types/index.js';
import { NETWORK_CONFIGS, CHAIN_IDS, EXPLORER_URLS } from './constants.js';

/**
 * Get network configuration for a given network
 * @param network - The network identifier
 * @returns Network configuration
 * @throws Error if network is not supported
 *
 * @example
 * ```typescript
 * const config = getNetworkConfig('starknet-sepolia');
 * console.log(config.rpcUrl); // https://starknet-sepolia.public.blastapi.io
 * ```
 */
export function getNetworkConfig(network: StarknetNetwork): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

/**
 * Get network identifier from chain ID
 * @param chainId - The chain ID (as hex string)
 * @returns Network identifier
 * @throws Error if chain ID is not recognized
 *
 * @example
 * ```typescript
 * const network = getNetworkFromChainId('0x534e5f5345504f4c4941');
 * console.log(network); // 'starknet-sepolia'
 * ```
 */
export function getNetworkFromChainId(chainId: string): StarknetNetwork {
  const normalizedChainId = chainId.toLowerCase();

  for (const [network, id] of Object.entries(CHAIN_IDS)) {
    if (id.toLowerCase() === normalizedChainId) {
      switch (network) {
        case 'MAINNET':
          return 'starknet-mainnet';
        case 'SEPOLIA':
          return 'starknet-sepolia';
        case 'DEVNET':
          return 'starknet-devnet';
      }
    }
  }

  throw new Error(`Unknown chain ID: ${chainId}`);
}

/**
 * Check if a network is a testnet
 * @param network - The network identifier
 * @returns True if the network is a testnet
 *
 * @example
 * ```typescript
 * console.log(isTestnet('starknet-sepolia')); // true
 * console.log(isTestnet('starknet-mainnet')); // false
 * ```
 */
export function isTestnet(network: StarknetNetwork): boolean {
  return network === 'starknet-sepolia' || network === 'starknet-devnet';
}

/**
 * Check if a network is mainnet
 * @param network - The network identifier
 * @returns True if the network is mainnet
 *
 * @example
 * ```typescript
 * console.log(isMainnet('starknet-mainnet')); // true
 * console.log(isMainnet('starknet-sepolia')); // false
 * ```
 */
export function isMainnet(network: StarknetNetwork): boolean {
  return network === 'starknet-mainnet';
}

/**
 * Get all supported networks
 * @returns Array of supported network identifiers
 *
 * @example
 * ```typescript
 * const networks = getSupportedNetworks();
 * console.log(networks); // ['starknet-mainnet', 'starknet-sepolia', 'starknet-devnet']
 * ```
 */
export function getSupportedNetworks(): Array<StarknetNetwork> {
  return Object.keys(NETWORK_CONFIGS) as Array<StarknetNetwork>;
}

/**
 * Get explorer URL for a transaction
 * @param network - The network identifier
 * @param txHash - The transaction hash
 * @returns Full URL to view transaction, or null if no explorer
 *
 * @example
 * ```typescript
 * const url = getTransactionUrl('starknet-sepolia', '0x1234...');
 * console.log(url); // 'https://sepolia.starkscan.co/tx/0x1234...'
 * ```
 */
export function getTransactionUrl(
  network: StarknetNetwork,
  txHash: string
): string | null {
  const explorerUrl = EXPLORER_URLS[network];
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 * @param network - The network identifier
 * @param address - The contract or account address
 * @returns Full URL to view address, or null if no explorer
 *
 * @example
 * ```typescript
 * const url = getAddressUrl('starknet-sepolia', '0x1234...');
 * console.log(url); // 'https://sepolia.starkscan.co/contract/0x1234...'
 * ```
 */
export function getAddressUrl(
  network: StarknetNetwork,
  address: string
): string | null {
  const explorerUrl = EXPLORER_URLS[network];
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/contract/${address}`;
}

/**
 * Validate network configuration
 * @param network - The network identifier
 * @throws Error if network configuration is invalid
 */
export function validateNetworkConfig(network: StarknetNetwork): void {
  const config = getNetworkConfig(network);

  if (!config.chainId) {
    throw new Error(`Network ${network} missing chain ID`);
  }

  if (!config.rpcUrl) {
    throw new Error(`Network ${network} missing RPC URL`);
  }

  try {
    new URL(config.rpcUrl);
  } catch {
    throw new Error(`Network ${network} has invalid RPC URL: ${config.rpcUrl}`);
  }
}

// Re-export constants
export {
  NETWORK_CONFIGS,
  CHAIN_IDS,
  DEFAULT_RPC_URLS,
  EXPLORER_URLS,
  NETWORK_NAMES,
  DEFAULT_PROVIDER_TIMEOUT,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_BACKOFF_MULTIPLIER,
} from './constants.js';
