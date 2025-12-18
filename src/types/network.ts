/**
 * Network type definitions for Starknet x402
 * Spec compliance: x402 v2 - CAIP-2 network identifiers
 */

/**
 * Supported Starknet networks (CAIP-2 format)
 * Format: "starknet:{reference}"
 * @see https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
 */
export type StarknetNetworkId =
  | 'starknet:mainnet'
  | 'starknet:sepolia'
  | 'starknet:devnet';

/**
 * Legacy network identifiers (deprecated, for backward compatibility)
 * @deprecated Use StarknetNetworkId (CAIP-2 format) instead
 */
export type StarknetNetworkLegacy =
  | 'starknet-mainnet'
  | 'starknet-sepolia'
  | 'starknet-devnet';

/**
 * Supported Starknet networks (supports both CAIP-2 and legacy formats)
 */
export type StarknetNetwork = StarknetNetworkId | StarknetNetworkLegacy;

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  /** Network identifier (CAIP-2 format) */
  network: StarknetNetworkId;
  /** Legacy network identifier (for backward compatibility) */
  legacyNetwork: StarknetNetworkLegacy;
  /** Starknet chain ID */
  chainId: string;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Block explorer URL (null for local devnet) */
  explorerUrl: string | null;
  /** Network display name */
  name: string;
}

/**
 * Starknet account configuration
 */
export interface AccountConfig {
  /** Account contract address */
  address: string;
  /** Private key for signing (optional for read-only) */
  privateKey?: string;
  /** Network the account is on */
  network: StarknetNetwork;
}

/**
 * RPC provider options
 */
export interface ProviderOptions {
  /** Network to connect to */
  network: StarknetNetwork;
  /** Custom RPC URL (overrides default) */
  rpcUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
}

/**
 * Mapping from CAIP-2 to legacy network identifiers
 */
const CAIP2_TO_LEGACY: Record<StarknetNetworkId, StarknetNetworkLegacy> = {
  'starknet:mainnet': 'starknet-mainnet',
  'starknet:sepolia': 'starknet-sepolia',
  'starknet:devnet': 'starknet-devnet',
};

/**
 * Mapping from legacy to CAIP-2 network identifiers
 */
const LEGACY_TO_CAIP2: Record<StarknetNetworkLegacy, StarknetNetworkId> = {
  'starknet-mainnet': 'starknet:mainnet',
  'starknet-sepolia': 'starknet:sepolia',
  'starknet-devnet': 'starknet:devnet',
};

/**
 * Check if a network identifier is in CAIP-2 format
 * @param network - Network identifier to check
 * @returns True if the network is in CAIP-2 format
 */
export function isCAIP2Network(network: string): network is StarknetNetworkId {
  return network.startsWith('starknet:');
}

/**
 * Check if a network identifier is in legacy format
 * @param network - Network identifier to check
 * @returns True if the network is in legacy format
 */
export function isLegacyNetwork(
  network: string
): network is StarknetNetworkLegacy {
  return network.startsWith('starknet-');
}

/**
 * Convert a network identifier to CAIP-2 format
 * @param network - Network identifier (CAIP-2 or legacy)
 * @returns Network identifier in CAIP-2 format
 */
export function toCAIP2Network(network: StarknetNetwork): StarknetNetworkId {
  if (isCAIP2Network(network)) {
    return network;
  }
  if (isLegacyNetwork(network)) {
    return LEGACY_TO_CAIP2[network];
  }
  throw new Error(`Unknown network format: ${network}`);
}

/**
 * Convert a network identifier to legacy format
 * @param network - Network identifier (CAIP-2 or legacy)
 * @returns Network identifier in legacy format
 * @deprecated Use CAIP-2 format (toCAIP2Network) for new code
 */
export function toLegacyNetwork(
  network: StarknetNetwork
): StarknetNetworkLegacy {
  if (isLegacyNetwork(network)) {
    return network;
  }
  if (isCAIP2Network(network)) {
    return CAIP2_TO_LEGACY[network];
  }
  throw new Error(`Unknown network format: ${network}`);
}

/**
 * Normalize a network identifier to CAIP-2 format
 * Accepts both CAIP-2 and legacy formats
 * @param network - Network identifier
 * @returns Normalized network identifier in CAIP-2 format
 */
export function normalizeNetwork(network: StarknetNetwork): StarknetNetworkId {
  return toCAIP2Network(network);
}

/**
 * Check if two network identifiers refer to the same network
 * Handles both CAIP-2 and legacy formats
 * @param a - First network identifier
 * @param b - Second network identifier
 * @returns True if both refer to the same network
 */
export function networksEqual(a: StarknetNetwork, b: StarknetNetwork): boolean {
  return toCAIP2Network(a) === toCAIP2Network(b);
}
