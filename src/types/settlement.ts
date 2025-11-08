/**
 * Settlement and verification type definitions for Starknet x402
 */

import type { StarknetNetwork } from './network.js';

/**
 * Reason for invalid payment
 */
export type InvalidPaymentReason =
  | 'invalid_signature'
  | 'insufficient_balance'
  | 'nonce_used'
  | 'expired'
  | 'invalid_network'
  | 'invalid_amount'
  | 'token_not_approved'
  | 'invalid_recipient'
  | 'contract_error'
  | 'unknown_error';

/**
 * Verification response from facilitator
 */
export interface VerifyResponse {
  /** Whether the payment is valid */
  isValid: boolean;
  /** Reason for invalidity if isValid is false */
  invalidReason?: InvalidPaymentReason;
  /** Payer address */
  payer: string;
  /** Additional verification details */
  details?: {
    /** Current token balance of payer */
    balance?: string;
    /** Whether nonce has been used */
    nonceUsed?: boolean;
    /** Current timestamp */
    timestamp?: number;
  };
}

/**
 * Settlement response from facilitator
 */
export interface SettleResponse {
  /** Whether settlement was successful */
  success: boolean;
  /** Reason for failure if success is false */
  errorReason?: string;
  /** Transaction hash */
  transaction: string;
  /** Network the transaction was submitted to */
  network: StarknetNetwork;
  /** Payer address */
  payer: string;
  /** Transaction status */
  status?: 'pending' | 'accepted_on_l2' | 'accepted_on_l1' | 'rejected';
  /** Block number (if accepted) */
  blockNumber?: number;
  /** Block hash (if accepted) */
  blockHash?: string;
}

/**
 * Settlement request to facilitator
 */
export interface SettleRequest {
  /** Payment payload from client */
  paymentPayload: unknown;
  /** Payment requirements from server */
  paymentRequirements: unknown;
}

/**
 * Verification request to facilitator
 */
export interface VerifyRequest {
  /** Payment payload from client */
  paymentPayload: unknown;
  /** Payment requirements from server */
  paymentRequirements: unknown;
}

/**
 * Supported payment kinds response
 */
export interface SupportedKindsResponse {
  /** Array of supported payment schemes and networks */
  kinds: Array<{
    /** Payment scheme */
    scheme: string;
    /** Network identifier */
    network: StarknetNetwork;
  }>;
}
