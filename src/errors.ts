/**
 * Custom error classes for x402-starknet
 */

/**
 * Base error class for all x402-starknet errors
 */
export class X402Error extends Error {
  /**
   * Stable error code for programmatic error handling
   */
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'X402Error';
    this.code = code;
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Payment-related errors
 */
export class PaymentError extends X402Error {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'PaymentError';
  }

  /**
   * Payment payload validation failed
   */
  static invalidPayload(details?: string): PaymentError {
    return new PaymentError(
      `Invalid payment payload${details ? `: ${details}` : ''}`,
      'INVALID_PAYLOAD'
    );
  }

  /**
   * Insufficient balance to make payment
   */
  static insufficientBalance(
    required: string,
    available: string
  ): PaymentError {
    return new PaymentError(
      `Insufficient balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE'
    );
  }

  /**
   * Payment verification failed
   */
  static verificationFailed(reason: string): PaymentError {
    return new PaymentError(
      `Payment verification failed: ${reason}`,
      'VERIFICATION_FAILED'
    );
  }

  /**
   * Payment settlement failed
   */
  static settlementFailed(reason: string): PaymentError {
    return new PaymentError(
      `Payment settlement failed: ${reason}`,
      'SETTLEMENT_FAILED'
    );
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends X402Error {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'NetworkError';
  }

  /**
   * Unsupported network
   */
  static unsupportedNetwork(network: string): NetworkError {
    return new NetworkError(
      `Unsupported network: ${network}`,
      'UNSUPPORTED_NETWORK'
    );
  }

  /**
   * Network mismatch between payload and requirements
   */
  static networkMismatch(expected: string, actual: string): NetworkError {
    return new NetworkError(
      `Network mismatch: expected ${expected}, got ${actual}`,
      'NETWORK_MISMATCH'
    );
  }

  /**
   * RPC call failed
   */
  static rpcFailed(details: string): NetworkError {
    return new NetworkError(`RPC call failed: ${details}`, 'RPC_FAILED');
  }
}

/**
 * Error code constants for stable programmatic handling
 */
export const ERROR_CODES = {
  // Payment errors
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  SETTLEMENT_FAILED: 'SETTLEMENT_FAILED',

  // Network errors
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  NETWORK_MISMATCH: 'NETWORK_MISMATCH',
  RPC_FAILED: 'RPC_FAILED',

  // Paymaster errors
  PAYMASTER_ERROR: 'PAYMASTER_ERROR',
  PAYMASTER_UNAVAILABLE: 'PAYMASTER_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
