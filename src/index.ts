/**
 * Starknet x402 Payment Protocol Library
 *
 * A pure library providing core functionality for implementing
 * the x402 payment protocol on Starknet.
 *
 * @module @x402/starknet
 * @version 0.1.0
 */

// Export all types
export * from './types/index.js';

// Export network utilities
export * from './networks/index.js';

// Export payment functions
export * from './payment/index.js';

// Export paymaster utilities
export * from './paymaster/index.js';

// Export utilities
export * from './utils/index.js';

/**
 * Library version
 */
export const VERSION = '0.1.0';

/**
 * Supported x402 protocol version
 */
export const X402_VERSION = 1;
