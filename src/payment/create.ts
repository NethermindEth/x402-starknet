/**
 * Payment creation functions
 */

import type {
  PaymentRequirements,
  PaymentPayload,
  PaymentRequirementsSelector,
  PaymasterConfig,
} from '../types/index.js';
import type { Account, RpcProvider, TypedData } from 'starknet';
import { num } from 'starknet';
import {
  createPaymasterClient,
  buildTransaction,
  createTransferCall,
  DEFAULT_PAYMASTER_ENDPOINTS,
} from '../paymaster/index.js';

/**
 * Select appropriate payment requirements from available options
 *
 * @param requirements - Array of payment requirement options
 * @param account - User's account
 * @param provider - RPC provider for balance checks
 * @returns Selected payment requirements
 * @throws Error if no requirements can be satisfied
 *
 * @example
 * ```typescript
 * const selected = await selectPaymentRequirements(
 *   requirements,
 *   account,
 *   provider
 * );
 * ```
 */
export function selectPaymentRequirements(
  requirements: Array<PaymentRequirements>,
  _account: Account,
  _provider: RpcProvider
): PaymentRequirements {
  // For now, simply return the first requirement
  // TODO: Add network compatibility checking
  // TODO: Add balance checking
  const firstRequirement = requirements[0];
  if (!firstRequirement) {
    throw new Error('No payment requirements provided');
  }
  return firstRequirement;
}

/**
 * Custom selector type for payment requirements
 */
export type { PaymentRequirementsSelector };

/**
 * Create payment payload for x402 request
 *
 * This builds a gasless transaction via paymaster and returns
 * the signed payload ready to send to the server.
 *
 * @param account - User's Starknet account
 * @param x402Version - x402 protocol version (currently 1)
 * @param paymentRequirements - Payment requirements from server
 * @param paymasterConfig - Paymaster configuration (endpoint, API key)
 * @returns Payment payload to send to server
 *
 * @example
 * ```typescript
 * const payload = await createPaymentPayload(
 *   account,
 *   1,
 *   paymentRequirements,
 *   {
 *     endpoint: 'http://localhost:12777',
 *     network: 'starknet-sepolia'
 *   }
 * );
 * ```
 */
export async function createPaymentPayload(
  account: Account,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
  paymasterConfig: PaymasterConfig
): Promise<PaymentPayload> {
  // 1. Create transfer call
  const transferCall = createTransferCall(
    paymentRequirements.asset,
    paymentRequirements.payTo,
    paymentRequirements.maxAmountRequired
  );

  // 2. Create paymaster client
  const client = createPaymasterClient(paymasterConfig);

  // 3. Build transaction with paymaster (sponsored mode - server pays gas)
  const buildResult = await buildTransaction(
    client,
    account.address,
    [transferCall],
    { mode: 'sponsored' } // Server pays gas
  );

  if (buildResult.type !== 'invoke') {
    throw new Error('Expected invoke transaction from paymaster');
  }

  // 4. Sign typed data
  const signature = await account.signMessage(buildResult.typed_data);

  // 5. Convert signature to array of hex strings
  // Signature can be either string[] or { r: bigint, s: bigint, recovery: number }
  let signatureArray: Array<string>;
  if (Array.isArray(signature)) {
    // Already an array, convert each element to hex
    signatureArray = signature.map((s) => num.toHex(s));
  } else {
    // Weierstrass signature object with r, s properties (BigInts)
    signatureArray = [num.toHex(signature.r), num.toHex(signature.s)];
  }

  // 6. Extract nonce and valid_until from typed data message
  const message = buildResult.typed_data.message as Record<string, unknown>;

  // Nonce should be hex format (0x...)
  const nonceValue = message.nonce ?? '0x0';
  const nonce = typeof nonceValue === 'string' || typeof nonceValue === 'number' || typeof nonceValue === 'bigint'
    ? String(nonceValue)
    : '0x0';

  // Valid until should be decimal string
  const validUntilValue = message.valid_until ?? message.validUntil ?? '0x0';
  const validUntil = typeof validUntilValue === 'string' && validUntilValue.startsWith('0x')
    ? BigInt(validUntilValue).toString()
    : (typeof validUntilValue === 'string' || typeof validUntilValue === 'number' || typeof validUntilValue === 'bigint'
      ? String(validUntilValue)
      : '0x0');

  // 7. Create payment payload
  const payload: PaymentPayload = {
    x402Version: x402Version as 1,
    scheme: 'exact',
    network: paymentRequirements.network,
    payload: {
      signature: {
        r: signatureArray[0] ?? '0x0',
        s: signatureArray[1] ?? '0x0',
      },
      authorization: {
        from: account.address,
        to: paymentRequirements.payTo,
        amount: paymentRequirements.maxAmountRequired,
        token: paymentRequirements.asset,
        nonce,
        validUntil,
      },
    },
  };

  // Store the typed data and paymaster endpoint for later execution
  // Note: The actual implementation needs to store this somewhere
  // for the facilitator to use when settling
  (payload as unknown as { typedData: TypedData }).typedData =
    buildResult.typed_data;
  (payload as unknown as { paymasterEndpoint: string }).paymasterEndpoint =
    paymasterConfig.endpoint;

  return payload;
}

/**
 * Get default paymaster endpoint for network
 *
 * @param network - Network identifier
 * @returns Default paymaster endpoint URL
 *
 * @example
 * ```typescript
 * const endpoint = getDefaultPaymasterEndpoint('starknet-sepolia');
 * ```
 */
export function getDefaultPaymasterEndpoint(
  network: 'starknet-mainnet' | 'starknet-sepolia' | 'starknet-devnet'
): string {
  return DEFAULT_PAYMASTER_ENDPOINTS[network];
}

/**
 * Encode payment payload to base64 string for X-PAYMENT header
 *
 * @param payload - Payment payload to encode
 * @returns Base64-encoded string
 *
 * @example
 * ```typescript
 * const header = encodePaymentHeader(payload);
 * // Use in HTTP request:
 * // headers: { 'X-PAYMENT': header }
 * ```
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64');
}

/**
 * Decode payment payload from base64 X-PAYMENT header
 *
 * @param encoded - Base64-encoded payment header
 * @returns Decoded payment payload
 *
 * @example
 * ```typescript
 * const payload = decodePaymentHeader(req.headers['x-payment']);
 * ```
 */
export function decodePaymentHeader(encoded: string): PaymentPayload {
  const json = Buffer.from(encoded, 'base64').toString('utf-8');
  return JSON.parse(json) as PaymentPayload;
}
