/**
 * Network configuration and utilities for Starknet x402
 * Spec compliance: x402 v2 - CAIP-2 network identifiers
 * @module networks
 */

import type {
  NetworkConfig,
  StarknetNetwork,
  StarknetNetworkId,
  StarknetNetworkLegacy,
} from '../types/index.js';
import { toCAIP2Network, toLegacyNetwork } from '../types/network.js';
import { NETWORK_CONFIGS, CHAIN_IDS, EXPLORER_URLS } from './constants.js';
import { err } from '../errors.js';

/**
 * Get network configuration for a given network
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier (CAIP-2 or legacy format)
 * @returns Network configuration
 * @throws Error if network is not supported
 *
 * @example
 * ```typescript
 * // Using CAIP-2 format (recommended)
 * const config = getNetworkConfig('starknet:sepolia');
 * console.log(config.rpcUrl); // https://starknet-sepolia.public.blastapi.io
 *
 * // Using legacy format (still supported)
 * const config2 = getNetworkConfig('starknet-sepolia');
 * console.log(config2.rpcUrl); // https://starknet-sepolia.public.blastapi.io
 * ```
 */
export function getNetworkConfig(network: StarknetNetwork): NetworkConfig {
  const caip2Network = toCAIP2Network(network);
  return NETWORK_CONFIGS[caip2Network];
}

/**
 * Get network identifier from chain ID
 * @param chainId - The chain ID (as hex string)
 * @param format - Output format: 'caip2' (default) or 'legacy'
 * @returns Network identifier in the specified format
 * @throws Error if chain ID is not recognized
 *
 * @example
 * ```typescript
 * // Get CAIP-2 format (default)
 * const network = getNetworkFromChainId('0x534e5f5345504f4c4941');
 * console.log(network); // 'starknet:sepolia'
 *
 * // Get legacy format
 * const legacyNetwork = getNetworkFromChainId('0x534e5f5345504f4c4941', 'legacy');
 * console.log(legacyNetwork); // 'starknet-sepolia'
 * ```
 */
export function getNetworkFromChainId(
  chainId: string,
  format: 'caip2' | 'legacy' = 'caip2'
): StarknetNetworkId | StarknetNetworkLegacy {
  const normalizedChainId = chainId.toLowerCase();

  for (const [network, id] of Object.entries(CHAIN_IDS)) {
    if (id.toLowerCase() === normalizedChainId) {
      const caip2Network: StarknetNetworkId | undefined = (() => {
        switch (network) {
          case 'MAINNET':
            return 'starknet:mainnet';
          case 'SEPOLIA':
            return 'starknet:sepolia';
          case 'DEVNET':
            return 'starknet:devnet';
          default:
            return undefined;
        }
      })();

      if (caip2Network) {
        return format === 'legacy'
          ? toLegacyNetwork(caip2Network)
          : caip2Network;
      }
    }
  }

  throw err.notFound(`Network with chain ID ${chainId}`);
}

/**
 * Check if a network is a testnet
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier
 * @returns True if the network is a testnet
 *
 * @example
 * ```typescript
 * console.log(isTestnet('starknet:sepolia')); // true
 * console.log(isTestnet('starknet:mainnet')); // false
 * console.log(isTestnet('starknet-sepolia')); // true (legacy format)
 * ```
 */
export function isTestnet(network: StarknetNetwork): boolean {
  const caip2 = toCAIP2Network(network);
  return caip2 === 'starknet:sepolia' || caip2 === 'starknet:devnet';
}

/**
 * Check if a network is mainnet
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier
 * @returns True if the network is mainnet
 *
 * @example
 * ```typescript
 * console.log(isMainnet('starknet:mainnet')); // true
 * console.log(isMainnet('starknet:sepolia')); // false
 * console.log(isMainnet('starknet-mainnet')); // true (legacy format)
 * ```
 */
export function isMainnet(network: StarknetNetwork): boolean {
  const caip2 = toCAIP2Network(network);
  return caip2 === 'starknet:mainnet';
}

/**
 * Get all supported networks in CAIP-2 format
 * @param format - Output format: 'caip2' (default) or 'legacy'
 * @returns Array of supported network identifiers
 *
 * @example
 * ```typescript
 * const networks = getSupportedNetworks();
 * console.log(networks); // ['starknet:mainnet', 'starknet:sepolia', 'starknet:devnet']
 *
 * const legacyNetworks = getSupportedNetworks('legacy');
 * console.log(legacyNetworks); // ['starknet-mainnet', 'starknet-sepolia', 'starknet-devnet']
 * ```
 */
export function getSupportedNetworks(
  format: 'caip2' | 'legacy' = 'caip2'
): Array<StarknetNetworkId> | Array<StarknetNetworkLegacy> {
  const caip2Networks = Object.keys(
    NETWORK_CONFIGS
  ) as Array<StarknetNetworkId>;
  if (format === 'legacy') {
    return caip2Networks.map(toLegacyNetwork);
  }
  return caip2Networks;
}

/**
 * Get explorer URL for a transaction
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier
 * @param txHash - The transaction hash
 * @returns Full URL to view transaction, or null if no explorer
 *
 * @example
 * ```typescript
 * const url = getTransactionUrl('starknet:sepolia', '0x1234...');
 * console.log(url); // 'https://sepolia.starkscan.co/tx/0x1234...'
 * ```
 */
export function getTransactionUrl(
  network: StarknetNetwork,
  txHash: string
): string | null {
  const caip2Network = toCAIP2Network(network);
  const explorerUrl = EXPLORER_URLS[caip2Network];
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier
 * @param address - The contract or account address
 * @returns Full URL to view address, or null if no explorer
 *
 * @example
 * ```typescript
 * const url = getAddressUrl('starknet:sepolia', '0x1234...');
 * console.log(url); // 'https://sepolia.starkscan.co/contract/0x1234...'
 * ```
 */
export function getAddressUrl(
  network: StarknetNetwork,
  address: string
): string | null {
  const caip2Network = toCAIP2Network(network);
  const explorerUrl = EXPLORER_URLS[caip2Network];
  if (!explorerUrl) {
    return null;
  }
  return `${explorerUrl}/contract/${address}`;
}

/**
 * Validate network configuration
 * Accepts both CAIP-2 and legacy network identifiers
 * @param network - The network identifier
 * @throws Error if network configuration is invalid
 */
export function validateNetworkConfig(network: StarknetNetwork): void {
  const config = getNetworkConfig(network);

  if (!config.chainId) {
    throw err.invalid(`Network ${network} missing chain ID`, { network });
  }

  if (!config.rpcUrl) {
    throw err.invalid(`Network ${network} missing RPC URL`, { network });
  }

  try {
    new URL(config.rpcUrl);
  } catch {
    throw err.invalid(`Network ${network} has invalid RPC URL`, {
      network,
      rpcUrl: config.rpcUrl,
    });
  }
}

// Re-export network conversion utilities
export {
  toCAIP2Network,
  toLegacyNetwork,
  networksEqual,
  isCAIP2Network,
  isLegacyNetwork,
} from '../types/network.js';

// Re-export constants
export {
  NETWORK_CONFIGS,
  CHAIN_IDS,
  DEFAULT_RPC_URLS,
  LEGACY_RPC_URLS,
  EXPLORER_URLS,
  NETWORK_NAMES,
  DEFAULT_PROVIDER_TIMEOUT,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_BACKOFF_MULTIPLIER,
} from './constants.js';
