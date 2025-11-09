/**
 * Paymaster RPC client
 */

import type {
  PaymasterConfig,
  BuildTransactionRequest,
  BuildTransactionResponse,
  ExecuteTransactionRequest,
  ExecuteTransactionResponse,
  SupportedTokensResponse,
  IsAvailableResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from '../types/paymaster.js';
import { PaymasterError } from '../types/paymaster.js';

/**
 * Paymaster RPC client for interacting with AVNU Paymaster
 */
export class PaymasterClient {
  private requestId = 0;

  constructor(private config: PaymasterConfig) {}

  /**
   * Make a JSON-RPC request to the paymaster
   */
  private async rpcCall<T>(method: string, params: unknown): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if provided (for sponsored mode)
    if (this.config.apiKey) {
      headers['x-paymaster-api-key'] = this.config.apiKey;
    }

    try {
      const requestBody = JSON.stringify(request);

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        throw new PaymasterError(
          `HTTP error: ${String(response.status)} ${response.statusText}`,
          response.status
        );
      }

      const jsonResponse = (await response.json()) as JsonRpcResponse<T>;

      if (jsonResponse.error) {
        throw new PaymasterError(
          jsonResponse.error.message,
          jsonResponse.error.code,
          jsonResponse.error.data
        );
      }

      if (jsonResponse.result === undefined) {
        throw new PaymasterError('No result in RPC response');
      }

      return jsonResponse.result;
    } catch (error) {
      if (error instanceof PaymasterError) {
        throw error;
      }
      throw new PaymasterError(
        `RPC call failed: ${(error as Error).message}`,
        undefined,
        error
      );
    }
  }

  /**
   * Build a transaction with paymaster
   *
   * @param request - Build transaction request
   * @returns Transaction with typed data for signing
   *
   * @example
   * ```typescript
   * const result = await client.buildTransaction({
   *   transaction: {
   *     type: 'invoke',
   *     invoke: {
   *       user_address: '0x1234...',
   *       calls: [{ to: '0x...', selector: 'transfer', calldata: [...] }]
   *     }
   *   },
   *   parameters: {
   *     version: '0x1',
   *     fee_mode: { mode: 'sponsored' }
   *   }
   * });
   * ```
   */
  async buildTransaction(
    request: BuildTransactionRequest
  ): Promise<BuildTransactionResponse> {
    return this.rpcCall<BuildTransactionResponse>(
      'paymaster_buildTransaction',
      request
    );
  }

  /**
   * Execute a transaction via paymaster
   *
   * @param request - Execute transaction request with signature
   * @returns Transaction hash
   *
   * @example
   * ```typescript
   * const result = await client.executeTransaction({
   *   transaction: { ... },
   *   parameters: { ... },
   *   signature: ['0x...', '0x...']
   * });
   * console.log('Transaction hash:', result.transaction_hash);
   * ```
   */
  async executeTransaction(
    request: ExecuteTransactionRequest
  ): Promise<ExecuteTransactionResponse> {
    return this.rpcCall<ExecuteTransactionResponse>(
      'paymaster_executeTransaction',
      request
    );
  }

  /**
   * Get list of supported gas tokens
   *
   * @returns Supported token addresses
   *
   * @example
   * ```typescript
   * const tokens = await client.getSupportedTokens();
   * console.log('Supported tokens:', tokens.tokens);
   * ```
   */
  async getSupportedTokens(): Promise<SupportedTokensResponse> {
    return this.rpcCall<SupportedTokensResponse>(
      'paymaster_getSupportedTokens',
      {}
    );
  }

  /**
   * Check if paymaster service is available
   *
   * @returns Availability status
   *
   * @example
   * ```typescript
   * const status = await client.isAvailable();
   * if (status.available) {
   *   console.log('Paymaster is ready');
   * }
   * ```
   */
  async isAvailable(): Promise<IsAvailableResponse> {
    return this.rpcCall<IsAvailableResponse>('paymaster_isAvailable', {});
  }

  /**
   * Get the endpoint URL
   */
  getEndpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Get the network
   */
  getNetwork(): string {
    return this.config.network;
  }
}

/**
 * Create a paymaster client
 *
 * @param config - Paymaster configuration
 * @returns Configured paymaster client
 *
 * @example
 * ```typescript
 * const client = createPaymasterClient({
 *   endpoint: 'https://paymaster.avnu.fi',
 *   network: 'starknet-sepolia',
 *   apiKey: 'optional-api-key'
 * });
 * ```
 */
export function createPaymasterClient(
  config: PaymasterConfig
): PaymasterClient {
  return new PaymasterClient(config);
}
