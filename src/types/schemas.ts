/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

/**
 * Schema for Starknet network
 */
export const STARKNET_NETWORK_SCHEMA = z.enum([
  'starknet-mainnet',
  'starknet-sepolia',
  'starknet-devnet',
]);

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

/**
 * Schema for payment requirements
 * Spec compliance: x402 v0.2 Section 5.1 - PaymentRequirements Schema
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
  outputSchema: z.object({}).passthrough().nullable().optional(),
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
 * Schema for payment payload
 * Note: Using passthrough() to allow extra fields for forward compatibility
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
    paymasterEndpoint: z
      .string()
      .url('Invalid paymaster endpoint URL')
      .optional(),
  })
  .passthrough(); // Allow additional fields for forward compatibility

/**
 * Schema for payment requirements response
 * Spec compliance: x402 v0.2 Section 5.1 - PaymentRequirementsResponse Schema
 */
export const PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA = z.object({
  x402Version: z.literal(1),
  error: z.string().min(1, 'Error message cannot be empty'),
  accepts: z.array(PAYMENT_REQUIREMENTS_SCHEMA).min(1),
});

/**
 * Schema for verify response
 */
/**
 * Schema for verify response
 * Spec compliance: x402 v0.2 Section 9 - Error Handling
 */
export const VERIFY_RESPONSE_SCHEMA = z.object({
  isValid: z.boolean(),
  invalidReason: z
    .enum([
      'invalid_signature',
      'insufficient_funds', // Updated per spec §9
      'nonce_used',
      'expired',
      'invalid_network',
      'invalid_amount',
      'token_not_approved',
      'invalid_recipient',
      'contract_error',
      'unexpected_verify_error', // Updated per spec §9
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
 * Schema for settle response
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

/**
 * Schema for network config
 */
export const NETWORK_CONFIG_SCHEMA = z.object({
  network: STARKNET_NETWORK_SCHEMA,
  chainId: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid chain ID format'),
  rpcUrl: z.string().url('RPC URL must be a valid URL'),
  explorerUrl: z.string().url('Explorer URL must be a valid URL').nullable(),
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
  rpcUrl: z.string().url('RPC URL must be a valid URL').optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
});
