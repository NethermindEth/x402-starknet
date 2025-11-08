/**
 * Paymaster integration utilities
 * @module paymaster
 */

// TODO: Implement in Phase 2
// This will include:
// - Paymaster client types
// - RPC client wrapper
// - Transaction building
// - Transaction execution

/**
 * Placeholder for paymaster client
 */
export class PaymasterClient {
  constructor(public endpoint: string) {}
}

/**
 * Create paymaster client
 */
export function createPaymasterClient(endpoint: string): PaymasterClient {
  return new PaymasterClient(endpoint);
}
