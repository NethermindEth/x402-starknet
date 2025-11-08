/**
 * Network type definitions for Starknet x402
 */

/**
 * Supported Starknet networks
 */
export type StarknetNetwork =
  | 'starknet-mainnet'
  | 'starknet-sepolia'
  | 'starknet-devnet';

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  /** Network identifier */
  network: StarknetNetwork;
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
