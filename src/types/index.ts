/**
 * Type definitions for Starknet x402
 * Spec compliance: x402 v2
 * @module types
 */

// Network types
export type {
  StarknetNetwork,
  StarknetNetworkId,
  StarknetNetworkLegacy,
  NetworkConfig,
  AccountConfig,
  ProviderOptions,
} from './network.js';

// Network conversion utilities
export {
  isCAIP2Network,
  isLegacyNetwork,
  toCAIP2Network,
  toLegacyNetwork,
  normalizeNetwork,
  networksEqual,
} from './network.js';

// Payment types (v2)
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
  PaymentRequirementsSelector,
  // Legacy v1 types (for backward compatibility)
  PaymentRequirementsV1,
  PaymentPayloadV1,
  PaymentRequirementsResponse,
} from './payment.js';

// Settlement types (v2)
export type {
  InvalidPaymentReason,
  VerifyResponse,
  SettleResponse,
  SettleRequest,
  VerifyRequest,
  SupportedKind,
  SupportedResponse,
  // Legacy v1 types (for backward compatibility)
  SupportedKindsResponse,
} from './settlement.js';

// Paymaster types
export type {
  PaymasterConfig,
  PaymasterFeeMode,
  InvokeParameters,
  TransactionParameters,
  ExecutionParameters,
  FeeEstimate,
  BuildTransactionRequest,
  InvokeTransactionResponse,
  BuildTransactionResponse,
  ExecuteTransactionRequest,
  ExecuteTransactionResponse,
  SupportedTokensResponse,
  IsAvailableResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from './paymaster.js';

// Zod schemas (v2)
export {
  // Network schemas
  STARKNET_NETWORK_ID_SCHEMA,
  STARKNET_NETWORK_LEGACY_SCHEMA,
  STARKNET_NETWORK_SCHEMA,
  // Common schemas
  PAYMENT_SCHEME_SCHEMA,
  SIGNATURE_SCHEMA,
  PAYMENT_AUTHORIZATION_SCHEMA,
  // v2 schemas
  RESOURCE_INFO_SCHEMA,
  EXTENSION_DATA_SCHEMA,
  PAYMENT_REQUIREMENTS_V2_SCHEMA,
  EXACT_STARKNET_PAYLOAD_SCHEMA,
  PAYMENT_PAYLOAD_V2_SCHEMA,
  PAYMENT_REQUIRED_SCHEMA,
  INVALID_PAYMENT_REASON_SCHEMA,
  VERIFY_RESPONSE_V2_SCHEMA,
  SETTLE_RESPONSE_V2_SCHEMA,
  SUPPORTED_KIND_SCHEMA,
  SUPPORTED_RESPONSE_SCHEMA,
  // Legacy v1 schemas (for backward compatibility)
  PAYMENT_REQUIREMENTS_SCHEMA,
  PAYMENT_PAYLOAD_SCHEMA,
  PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA,
  VERIFY_RESPONSE_SCHEMA,
  SETTLE_RESPONSE_SCHEMA,
  // Config schemas
  NETWORK_CONFIG_SCHEMA,
  ACCOUNT_CONFIG_SCHEMA,
  PROVIDER_OPTIONS_SCHEMA,
} from './schemas.js';
