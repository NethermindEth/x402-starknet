/**
 * Starknet x402 Payment Protocol Library
 *
 * A pure library providing core functionality for implementing
 * the x402 payment protocol on Starknet.
 *
 * @module @x402/starknet
 * @version 0.1.0
 */

// ============================================================================
// Payment Operations (Core API)
// ============================================================================

export { createPaymentPayload } from './payment/create.js';
export { verifyPayment } from './payment/verify.js';
export { settlePayment } from './payment/settle.js';

// ============================================================================
// Encoding Utilities
// ============================================================================

export { encodePaymentHeader, decodePaymentHeader } from './payment/create.js';

// ============================================================================
// Network Utilities
// ============================================================================

export {
  getNetworkConfig,
  getTransactionUrl,
  getAddressUrl,
  isTestnet,
  isMainnet,
  getSupportedNetworks,
} from './networks/index.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Library version
 */
export const VERSION = '0.1.0';

/**
 * Supported x402 protocol version
 */
export const X402_VERSION = 1;

/**
 * Default AVNU paymaster endpoints for each network
 */
export { DEFAULT_PAYMASTER_ENDPOINTS } from './paymaster/helpers.js';

/**
 * Network configurations for all supported Starknet networks
 */
export { NETWORK_CONFIGS } from './networks/constants.js';

// ============================================================================
// TypeScript Types (All Public)
// ============================================================================

// Network types
export type { StarknetNetwork, NetworkConfig } from './types/network.js';

// Payment types
export type {
  PaymentScheme,
  Signature,
  PaymentAuthorization,
  PaymentRequirements,
  PaymentPayload,
  PaymentRequirementsResponse,
} from './types/payment.js';

// Settlement types
export type {
  InvalidPaymentReason,
  VerifyResponse,
  SettleResponse,
} from './types/settlement.js';

// Paymaster types
export type { PaymasterConfig } from './types/paymaster.js';

// ============================================================================
// Error Classes
// ============================================================================

export {
  X402Error,
  PaymentError,
  NetworkError,
  ERROR_CODES,
  type ErrorCode,
} from './errors.js';
