/**
 * Network constants for Starknet
 */

import type { NetworkConfig, StarknetNetwork } from '../types/index.js';

/**
 * Starknet chain IDs
 */
export const CHAIN_IDS = {
  MAINNET: '0x534e5f4d41494e', // SN_MAIN
  SEPOLIA: '0x534e5f5345504f4c4941', // SN_SEPOLIA
  DEVNET: '0x534e5f474f45524c49', // SN_GOERLI (commonly used for devnet)
} as const;

/**
 * Default RPC URLs for Starknet networks
 */
export const DEFAULT_RPC_URLS = {
  'starknet-mainnet': 'https://starknet-mainnet.public.blastapi.io',
  'starknet-sepolia': 'https://starknet-sepolia.public.blastapi.io',
  'starknet-devnet': 'http://localhost:5050',
} as const;

/**
 * Block explorer URLs
 */
export const EXPLORER_URLS = {
  'starknet-mainnet': 'https://starkscan.co',
  'starknet-sepolia': 'https://sepolia.starkscan.co',
  'starknet-devnet': null,
} as const;

/**
 * Network display names
 */
export const NETWORK_NAMES = {
  'starknet-mainnet': 'Starknet Mainnet',
  'starknet-sepolia': 'Starknet Sepolia Testnet',
  'starknet-devnet': 'Starknet Devnet (Local)',
} as const;

/**
 * Complete network configurations
 */
export const NETWORK_CONFIGS: Record<StarknetNetwork, NetworkConfig> = {
  'starknet-mainnet': {
    network: 'starknet-mainnet',
    chainId: CHAIN_IDS.MAINNET,
    rpcUrl: DEFAULT_RPC_URLS['starknet-mainnet'],
    explorerUrl: EXPLORER_URLS['starknet-mainnet'],
    name: NETWORK_NAMES['starknet-mainnet'],
  },
  'starknet-sepolia': {
    network: 'starknet-sepolia',
    chainId: CHAIN_IDS.SEPOLIA,
    rpcUrl: DEFAULT_RPC_URLS['starknet-sepolia'],
    explorerUrl: EXPLORER_URLS['starknet-sepolia'],
    name: NETWORK_NAMES['starknet-sepolia'],
  },
  'starknet-devnet': {
    network: 'starknet-devnet',
    chainId: CHAIN_IDS.DEVNET,
    rpcUrl: DEFAULT_RPC_URLS['starknet-devnet'],
    explorerUrl: EXPLORER_URLS['starknet-devnet'],
    name: NETWORK_NAMES['starknet-devnet'],
  },
};

/**
 * Default provider timeout in milliseconds
 */
export const DEFAULT_PROVIDER_TIMEOUT = 30000;

/**
 * Default number of retry attempts for RPC calls
 */
export const DEFAULT_RETRY_ATTEMPTS = 3;

/**
 * Default backoff multiplier for retries
 */
export const DEFAULT_BACKOFF_MULTIPLIER = 2;
