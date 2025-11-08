/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

/**
 * Schema for Starknet network
 */
export const StarknetNetworkSchema = z.enum([
  'starknet-mainnet',
  'starknet-sepolia',
  'starknet-devnet',
]);

/**
 * Schema for payment scheme
 */
export const PaymentSchemeSchema = z.literal('exact');

/**
 * Schema for signature
 */
export const SignatureSchema = z.object({
  r: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid felt format for r'),
  s: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid felt format for s'),
});

/**
 * Schema for payment authorization
 */
export const PaymentAuthorizationSchema = z.object({
  from: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  to: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  amount: z.string().regex(/^\d+$/, 'Amount must be a numeric string'),
  token: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid token address format'),
  nonce: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid nonce format'),
  validUntil: z.string().regex(/^\d+$/, 'Valid until must be a numeric string'),
});

/**
 * Schema for payment requirements
 */
export const PaymentRequirementsSchema = z.object({
  scheme: PaymentSchemeSchema,
  network: StarknetNetworkSchema,
  maxAmountRequired: z
    .string()
    .regex(/^\d+$/, 'Max amount must be a numeric string'),
  asset: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid asset address format'),
  payTo: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payTo address format'),
  resource: z.string().url('Resource must be a valid URL'),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive().optional(),
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
 */
export const PaymentPayloadSchema = z.object({
  x402Version: z.literal(1),
  scheme: PaymentSchemeSchema,
  network: StarknetNetworkSchema,
  payload: z.object({
    signature: SignatureSchema,
    authorization: PaymentAuthorizationSchema,
  }),
});

/**
 * Schema for payment requirements response
 */
export const PaymentRequirementsResponseSchema = z.object({
  x402Version: z.literal(1),
  paymentRequirements: z.array(PaymentRequirementsSchema).min(1),
});

/**
 * Schema for verify response
 */
export const VerifyResponseSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z
    .enum([
      'invalid_signature',
      'insufficient_balance',
      'nonce_used',
      'expired',
      'invalid_network',
      'invalid_amount',
      'token_not_approved',
      'invalid_recipient',
      'contract_error',
      'unknown_error',
    ])
    .optional(),
  payer: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid payer address format'),
  details: z
    .object({
      balance: z.string().optional(),
      nonceUsed: z.boolean().optional(),
      timestamp: z.number().int().optional(),
    })
    .optional(),
});

/**
 * Schema for settle response
 */
export const SettleResponseSchema = z.object({
  success: z.boolean(),
  errorReason: z.string().optional(),
  transaction: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid transaction hash format'),
  network: StarknetNetworkSchema,
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
export const NetworkConfigSchema = z.object({
  network: StarknetNetworkSchema,
  chainId: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid chain ID format'),
  rpcUrl: z.string().url('RPC URL must be a valid URL'),
  explorerUrl: z.string().url('Explorer URL must be a valid URL').nullable(),
  name: z.string().min(1, 'Network name cannot be empty'),
});

/**
 * Schema for account config
 */
export const AccountConfigSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid address format'),
  privateKey: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, 'Invalid private key format')
    .optional(),
  network: StarknetNetworkSchema,
});

/**
 * Schema for provider options
 */
export const ProviderOptionsSchema = z.object({
  network: StarknetNetworkSchema,
  rpcUrl: z.string().url('RPC URL must be a valid URL').optional(),
  timeout: z.number().int().positive().optional(),
  retries: z.number().int().nonnegative().optional(),
});
