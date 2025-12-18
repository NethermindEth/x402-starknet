/**
 * Starknet x402 Payment Protocol Library
 *
 * A pure library providing core functionality for implementing
 * the x402 payment protocol on Starknet.
 *
 * Spec compliance: x402 v2
 *
 * @module @x402/starknet
 * @version 0.2.0
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

export {
  encodePaymentSignature,
  decodePaymentSignature,
  encodePaymentRequired,
  decodePaymentRequired,
  encodePaymentResponse,
  decodePaymentResponse,
  HTTP_HEADERS,
} from './payment/create.js';

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
export const VERSION = '0.2.0';

/**
 * Supported x402 protocol version
 */
export const X402_VERSION = 2;

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
export type {
  StarknetNetwork,
  StarknetNetworkId,
  NetworkConfig,
} from './types/network.js';

// Payment types
export type {
  PaymentScheme,
  Signature,
  PaymentAuthorization,
  ResourceInfo,
  ExtensionData,
  PaymentRequirements,
  PaymentRequired,
  ExactStarknetPayload,
  PaymentPayload,
} from './types/payment.js';

// Settlement types
export type {
  InvalidPaymentReason,
  VerifyResponse,
  SettleResponse,
  SupportedKind,
  SupportedResponse,
} from './types/settlement.js';

// Paymaster types
export type { PaymasterConfig } from './types/paymaster.js';

// Facilitator types
export type {
  FacilitatorClientConfig,
  IFacilitatorClient,
} from './facilitator/client.js';

// Extension types
export type {
  Extension,
  IExtensionRegistry,
  ValidationResult,
  JSONSchema,
} from './extensions/types.js';

// ============================================================================
// Facilitator Client
// ============================================================================

export {
  FacilitatorClient,
  createFacilitatorClient,
} from './facilitator/index.js';

// ============================================================================
// Extensions System
// ============================================================================

export {
  ExtensionRegistry,
  createExtensionRegistry,
  globalRegistry,
  createExtensionData,
  getExtensionInfo,
  hasExtension,
  getExtensionNames,
  mergeExtensions,
  filterRegisteredExtensions,
  validateExtensions,
  defineExtension,
} from './extensions/index.js';

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
