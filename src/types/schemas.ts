/**
 * Zod schemas for runtime validation
 * Spec compliance: x402 v2
 */

import { z } from 'zod';

// ============================================================================
// Network Schemas
// ============================================================================

/**
 * Schema for Starknet network (CAIP-2 format)
 * Spec compliance: x402 v2 - CAIP-2 network identifiers
 */
export const STARKNET_NETWORK_ID_SCHEMA = z.enum([
  'starknet:mainnet',
  'starknet:sepolia',
  'starknet:devnet',
]);

/**
 * Schema for legacy Starknet network identifiers
 * @deprecated Use STARKNET_NETWORK_ID_SCHEMA for v2
 */
export const STARKNET_NETWORK_LEGACY_SCHEMA = z.enum([
  'starknet-mainnet',
  'starknet-sepolia',
  'starknet-devnet',
]);

/**
 * Schema for Starknet network (accepts both CAIP-2 and legacy formats)
 */
export const STARKNET_NETWORK_SCHEMA = z.union([
  STARKNET_NETWORK_ID_SCHEMA,
  STARKNET_NETWORK_LEGACY_SCHEMA,
]);

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Schema for payment scheme
 */
export const PAYMENT_SCHEME_SCHEMA = z.literal('exact');

/**
 * Schema for signature
 */
export const SIGNATURE_SCHEMA = z.object({
  r: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid felt format for r'),
  s: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid felt format for s'),
});

/**
 * Schema for payment authorization
 */
export const PAYMENT_AUTHORIZATION_SCHEMA = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  to: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  amount: z.string().regex(/^\d+$/, 'Amount must be a numeric string'),
  token: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid token address format'),
  nonce: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid nonce format'),
  validUntil: z.string().regex(/^\d+$/, 'Valid until must be a numeric string'),
});

// ============================================================================
// x402 v2 Schemas
// ============================================================================

/**
 * Schema for resource info (v2)
 * Spec compliance: x402 v2 - ResourceInfo Schema
 */
export const RESOURCE_INFO_SCHEMA = z.object({
  url: z.string().min(1, 'URL is required'),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

/**
 * Schema for extension data (v2)
 * Spec compliance: x402 v2 - Extensions System
 */
export const EXTENSION_DATA_SCHEMA = z.object({
  info: z.unknown(),
  schema: z.object({}).optional(),
});

/**
 * Schema for payment requirements (v2)
 * Spec compliance: x402 v2 - PaymentRequirements Schema
 */
export const PAYMENT_REQUIREMENTS_V2_SCHEMA = z.object({
  scheme: PAYMENT_SCHEME_SCHEMA,
  network: STARKNET_NETWORK_ID_SCHEMA,
  amount: z.string().regex(/^\d+$/, 'Amount must be a numeric string'),
  asset: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid asset address format'),
  payTo: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payTo address format'),
  maxTimeoutSeconds: z
    .number()
    .int()
    .positive('maxTimeoutSeconds must be a positive integer'),
  extra: z
    .object({
      name: z.string().optional(),
      symbol: z.string().optional(),
      decimals: z.number().int().nonnegative().optional(),
      paymentContract: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/, 'Invalid payment contract address')
        .optional(),
    })
    .optional(),
});

/**
 * Schema for exact starknet payload (v2)
 * Spec compliance: x402 v2 - scheme_exact_starknet
 */
export const EXACT_STARKNET_PAYLOAD_SCHEMA = z.object({
  signature: SIGNATURE_SCHEMA,
  authorization: PAYMENT_AUTHORIZATION_SCHEMA,
});

/**
 * Schema for payment payload (v2)
 * Spec compliance: x402 v2 - PaymentPayload Schema
 */
export const PAYMENT_PAYLOAD_V2_SCHEMA = z
  .object({
    x402Version: z.literal(2),
    resource: RESOURCE_INFO_SCHEMA.optional(),
    accepted: PAYMENT_REQUIREMENTS_V2_SCHEMA,
    payload: EXACT_STARKNET_PAYLOAD_SCHEMA,
    extensions: z.record(z.string(), z.unknown()).optional(),
    typedData: z.unknown().optional(),
    paymasterEndpoint: z.url('Invalid paymaster endpoint URL').optional(),
  })
  .loose(); // Allow additional fields for forward compatibility

/**
 * Schema for payment required response (v2)
 * Spec compliance: x402 v2 - PaymentRequired Schema (402 response)
 */
export const PAYMENT_REQUIRED_SCHEMA = z.object({
  x402Version: z.literal(2),
  error: z.string().optional(),
  resource: RESOURCE_INFO_SCHEMA,
  accepts: z.array(PAYMENT_REQUIREMENTS_V2_SCHEMA).min(1),
  extensions: z.record(z.string(), EXTENSION_DATA_SCHEMA).optional(),
});

/**
 * Schema for invalid payment reason (v2)
 * Spec compliance: x402 v2 - Error Codes
 */
export const INVALID_PAYMENT_REASON_SCHEMA = z.enum([
  // Generic error codes
  'invalid_signature',
  'insufficient_funds',
  'invalid_network',
  'invalid_amount',
  'invalid_payload',
  'invalid_payment_requirements',
  'invalid_scheme',
  'unsupported_scheme',
  'invalid_x402_version',
  'invalid_transaction_state',
  'unexpected_verify_error',
  'unexpected_settle_error',
  // Starknet-specific error codes (following v2 scheme naming pattern)
  'invalid_exact_starknet_payload_authorization_valid_until',
  'invalid_exact_starknet_payload_authorization_value',
  'invalid_exact_starknet_payload_signature',
  'invalid_exact_starknet_payload_recipient_mismatch',
  'invalid_exact_starknet_payload_token_mismatch',
  'invalid_exact_starknet_payload_nonce_used',
  // Legacy error codes (for backward compatibility)
  'nonce_used',
  'expired',
  'token_not_approved',
  'invalid_recipient',
  'contract_error',
]);

/**
 * Schema for verify response (v2)
 * Spec compliance: x402 v2 - VerifyResponse Schema
 */
export const VERIFY_RESPONSE_V2_SCHEMA = z.object({
  isValid: z.boolean(),
  invalidReason: INVALID_PAYMENT_REASON_SCHEMA.optional(),
  payer: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid payer address format')
    .optional(),
  details: z
    .object({
      balance: z.string().optional(),
      nonceUsed: z.boolean().optional(),
      timestamp: z.number().int().optional(),
      error: z.string().optional(),
      validUntil: z.string().optional(),
      currentTimestamp: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for settle response (v2)
 * Spec compliance: x402 v2 - SettlementResponse Schema
 */
export const SETTLE_RESPONSE_V2_SCHEMA = z.object({
  success: z.boolean(),
  errorReason: z.string().optional(),
  payer: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid payer address format')
    .optional(),
  transaction: z.string(), // Can be empty string on failure
  network: STARKNET_NETWORK_ID_SCHEMA,
  status: z
    .enum(['pending', 'accepted_on_l2', 'accepted_on_l1', 'rejected'])
    .optional(),
  blockNumber: z.number().int().nonnegative().optional(),
  blockHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid block hash format')
    .optional(),
});

/**
 * Schema for supported kind (v2)
 * Spec compliance: x402 v2 - GET /supported
 */
export const SUPPORTED_KIND_SCHEMA = z.object({
  x402Version: z.literal(2),
  scheme: PAYMENT_SCHEME_SCHEMA,
  network: STARKNET_NETWORK_ID_SCHEMA,
  extra: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for supported response (v2)
 * Spec compliance: x402 v2 - GET /supported Response
 */
export const SUPPORTED_RESPONSE_SCHEMA = z.object({
  kinds: z.array(SUPPORTED_KIND_SCHEMA),
  extensions: z.array(z.string()),
  signers: z.record(z.string(), z.array(z.string())),
});

// ============================================================================
// Legacy Schemas (v1 compatibility)
// ============================================================================

/**
 * Schema for payment requirements (v1)
 * @deprecated Use PAYMENT_REQUIREMENTS_V2_SCHEMA for v2
 */
export const PAYMENT_REQUIREMENTS_SCHEMA = z.object({
  scheme: PAYMENT_SCHEME_SCHEMA,
  network: STARKNET_NETWORK_SCHEMA,
  maxAmountRequired: z
    .string()
    .regex(/^\d+$/, 'Max amount must be a numeric string'),
  asset: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid asset address format'),
  payTo: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payTo address format'),
  resource: z
    .string()
    .min(
      1,
      'Resource must be a non-empty string (supports HTTP, MCP, A2A, etc.)'
    ),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  outputSchema: z.looseObject({}).nullable().optional(),
  maxTimeoutSeconds: z
    .number()
    .int()
    .positive('maxTimeoutSeconds must be a positive integer'),
  extra: z
    .object({
      tokenName: z.string().optional(),
      tokenSymbol: z.string().optional(),
      tokenDecimals: z.number().int().nonnegative().optional(),
      paymentContract: z
        .string()
        .regex(/^0x[0-9a-fA-F]+$/, 'Invalid payment contract address')
        .optional(),
    })
    .optional(),
});

/**
 * Schema for payment payload (v1)
 * @deprecated Use PAYMENT_PAYLOAD_V2_SCHEMA for v2
 */
export const PAYMENT_PAYLOAD_SCHEMA = z
  .object({
    x402Version: z.literal(1),
    scheme: PAYMENT_SCHEME_SCHEMA,
    network: STARKNET_NETWORK_SCHEMA,
    payload: z.object({
      signature: SIGNATURE_SCHEMA,
      authorization: PAYMENT_AUTHORIZATION_SCHEMA,
    }),
    settlementTransaction: z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/, 'Invalid transaction hash format')
      .optional(),
    typedData: z.unknown().optional(),
    paymasterEndpoint: z.url('Invalid paymaster endpoint URL').optional(),
  })
  .loose(); // Allow additional fields for forward compatibility

/**
 * Schema for payment requirements response (v1)
 * @deprecated Use PAYMENT_REQUIRED_SCHEMA for v2
 */
export const PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA = z.object({
  x402Version: z.literal(1),
  error: z.string().min(1, 'Error message cannot be empty'),
  accepts: z.array(PAYMENT_REQUIREMENTS_SCHEMA).min(1),
});

/**
 * Schema for verify response (v1)
 * @deprecated Use VERIFY_RESPONSE_V2_SCHEMA for v2
 */
export const VERIFY_RESPONSE_SCHEMA = z.object({
  isValid: z.boolean(),
  invalidReason: z
    .enum([
      'invalid_signature',
      'insufficient_funds',
      'nonce_used',
      'expired',
      'invalid_network',
      'invalid_amount',
      'token_not_approved',
      'invalid_recipient',
      'contract_error',
      'unexpected_verify_error',
    ])
    .optional(),
  payer: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payer address format'),
  details: z
    .object({
      balance: z.string().optional(),
      nonceUsed: z.boolean().optional(),
      timestamp: z.number().int().optional(),
      error: z.string().optional(),
      validUntil: z.string().optional(),
      currentTimestamp: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for settle response (v1)
 * @deprecated Use SETTLE_RESPONSE_V2_SCHEMA for v2
 */
export const SETTLE_RESPONSE_SCHEMA = z.object({
  success: z.boolean(),
  errorReason: z.string().optional(),
  transaction: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid transaction hash format'),
  network: STARKNET_NETWORK_SCHEMA,
  payer: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payer address format'),
  status: z
    .enum(['pending', 'accepted_on_l2', 'accepted_on_l1', 'rejected'])
    .optional(),
  blockNumber: z.number().int().nonnegative().optional(),
  blockHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid block hash format')
    .optional(),
});

// ============================================================================
// Config Schemas
// ============================================================================

/**
 * Schema for network config (v2)
 */
export const NETWORK_CONFIG_SCHEMA = z.object({
  network: STARKNET_NETWORK_ID_SCHEMA,
  legacyNetwork: STARKNET_NETWORK_LEGACY_SCHEMA,
  chainId: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid chain ID format'),
  rpcUrl: z.url('RPC URL must be a valid URL'),
  explorerUrl: z.url('Explorer URL must be a valid URL').nullable(),
  name: z.string().min(1, 'Network name cannot be empty'),
});

/**
 * Schema for account config
 */
export const ACCOUNT_CONFIG_SCHEMA = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  privateKey: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid private key format')
    .optional(),
  network: STARKNET_NETWORK_SCHEMA,
});

/**
 * Schema for provider options
 */
export const PROVIDER_OPTIONS_SCHEMA = z.object({
  network: STARKNET_NETWORK_SCHEMA,
  rpcUrl: z.url('RPC URL must be a valid URL').optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
});
