/**
 * Tests for payment response header encoding/decoding functions
 */

import { describe, it, expect } from 'vitest';
import {
  encodePaymentResponseHeader,
  decodePaymentResponseHeader,
} from '../../src/payment/create.js';
import type { PaymentRequirementsResponse } from '../../src/types/index.js';

describe('Payment Response Header Helpers', () => {
  const validResponse: PaymentRequirementsResponse = {
    x402Version: 1,
    error: 'Payment required to access this resource',
    accepts: [
      {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset:
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        payTo:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        resource: 'https://api.example.com/data',
        maxTimeoutSeconds: 300,
      },
    ],
  };

  describe('encodePaymentResponseHeader', () => {
    it('should encode PaymentRequirementsResponse to base64', () => {
      const encoded = encodePaymentResponseHeader(validResponse);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(encoded, 'base64')).not.toThrow();
    });

    it('should produce valid base64 that can be decoded', () => {
      const encoded = encodePaymentResponseHeader(validResponse);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(validResponse);
    });

    it('should handle response with multiple payment requirements', () => {
      const multiResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'Choose a payment method',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'https://api.example.com/data',
            maxTimeoutSeconds: 300,
          },
          {
            scheme: 'exact',
            network: 'starknet-mainnet',
            maxAmountRequired: '2000000',
            asset:
              '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
            payTo:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            resource: 'https://api.example.com/data',
            maxTimeoutSeconds: 600,
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(multiResponse);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(multiResponse);
      expect(parsed.accepts).toHaveLength(2);
    });

    it('should handle response with optional fields', () => {
      const responseWithOptionals: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'https://api.example.com/data',
            description: 'Access to premium API features',
            mimeType: 'application/json',
            maxTimeoutSeconds: 300,
            extra: {
              tokenName: 'Ether',
              tokenSymbol: 'ETH',
              tokenDecimals: 18,
            },
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(responseWithOptionals);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(responseWithOptionals);
      expect(parsed.accepts[0].description).toBe(
        'Access to premium API features'
      );
      expect(parsed.accepts[0].extra?.tokenName).toBe('Ether');
    });

    it('should handle responses with special characters in error message', () => {
      const responseWithSpecialChars: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'Payment required: "Premium" access costs $1.00',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'https://api.example.com/data',
            maxTimeoutSeconds: 300,
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(responseWithSpecialChars);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      expect(parsed.error).toBe(
        'Payment required: "Premium" access costs $1.00'
      );
    });
  });

  describe('decodePaymentResponseHeader', () => {
    it('should decode valid base64 encoded response', () => {
      const encoded = encodePaymentResponseHeader(validResponse);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded).toEqual(validResponse);
    });

    it('should decode response and preserve all fields', () => {
      const encoded = encodePaymentResponseHeader(validResponse);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded.x402Version).toBe(1);
      expect(decoded.error).toBe('Payment required to access this resource');
      expect(decoded.accepts).toHaveLength(1);
      expect(decoded.accepts[0].scheme).toBe('exact');
      expect(decoded.accepts[0].network).toBe('starknet-sepolia');
      expect(decoded.accepts[0].maxAmountRequired).toBe('1000000');
    });

    it('should throw error for non-object decoded values', () => {
      // Encode an array instead of object
      const invalidEncoded = Buffer.from(JSON.stringify([])).toString('base64');

      expect(() => decodePaymentResponseHeader(invalidEncoded)).toThrow(
        'Invalid payment response: must be an object'
      );
    });

    it('should throw error for null decoded values', () => {
      const invalidEncoded = Buffer.from(JSON.stringify(null)).toString(
        'base64'
      );

      expect(() => decodePaymentResponseHeader(invalidEncoded)).toThrow(
        'Invalid payment response: must be an object'
      );
    });

    it('should throw error for string decoded values', () => {
      const invalidEncoded = Buffer.from(
        JSON.stringify('not an object')
      ).toString('base64');

      expect(() => decodePaymentResponseHeader(invalidEncoded)).toThrow(
        'Invalid payment response: must be an object'
      );
    });

    it('should throw error for number decoded values', () => {
      const invalidEncoded = Buffer.from(JSON.stringify(123)).toString(
        'base64'
      );

      expect(() => decodePaymentResponseHeader(invalidEncoded)).toThrow(
        'Invalid payment response: must be an object'
      );
    });

    it('should throw error for invalid base64', () => {
      const invalidBase64 = 'not-valid-base64!!!';

      expect(() => decodePaymentResponseHeader(invalidBase64)).toThrow();
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = Buffer.from('{ invalid json }').toString('base64');

      expect(() => decodePaymentResponseHeader(invalidJson)).toThrow();
    });
  });

  describe('Round-trip encoding/decoding', () => {
    it('should survive round-trip encoding and decoding', () => {
      const original = validResponse;
      const encoded = encodePaymentResponseHeader(original);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded).toEqual(original);
    });

    it('should handle multiple round-trips', () => {
      let current = validResponse;

      for (let i = 0; i < 5; i++) {
        const encoded = encodePaymentResponseHeader(current);
        current = decodePaymentResponseHeader(encoded);
      }

      expect(current).toEqual(validResponse);
    });

    it('should preserve complex nested structures', () => {
      const complexResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'Complex payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'mcp://example.com/resource',
            description: 'Complex nested structure test',
            maxTimeoutSeconds: 300,
            extra: {
              tokenName: 'Test Token',
              tokenSymbol: 'TEST',
              tokenDecimals: 18,
              paymentContract:
                '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            },
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(complexResponse);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded).toEqual(complexResponse);
      expect(decoded.accepts[0].extra?.tokenName).toBe('Test Token');
      expect(decoded.accepts[0].extra?.paymentContract).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
    });
  });

  describe('Security and edge cases', () => {
    it('should handle empty accepts array', () => {
      const emptyAccepts: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'No payment methods available',
        accepts: [],
      };

      const encoded = encodePaymentResponseHeader(emptyAccepts);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded).toEqual(emptyAccepts);
      expect(decoded.accepts).toHaveLength(0);
    });

    it('should handle very long error messages', () => {
      const longError = 'A'.repeat(10000);
      const longErrorResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: longError,
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'https://api.example.com/data',
            maxTimeoutSeconds: 300,
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(longErrorResponse);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded.error).toBe(longError);
      expect(decoded.error).toHaveLength(10000);
    });

    it('should handle Unicode characters in error message', () => {
      const unicodeResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: '支付需要 💰 Paiement requis 🔒',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            resource: 'https://api.example.com/data',
            maxTimeoutSeconds: 300,
          },
        ],
      };

      const encoded = encodePaymentResponseHeader(unicodeResponse);
      const decoded = decodePaymentResponseHeader(encoded);

      expect(decoded.error).toBe('支付需要 💰 Paiement requis 🔒');
    });

    it('should not allow prototype pollution via __proto__', () => {
      const maliciousJson = JSON.stringify({
        x402Version: 1,
        error: 'test',
        accepts: [],
        __proto__: { polluted: true },
      });
      const encoded = Buffer.from(maliciousJson).toString('base64');

      const decoded = decodePaymentResponseHeader(encoded);

      // Should decode but not pollute Object.prototype
      expect(decoded).toHaveProperty('x402Version');
      expect(Object.prototype).not.toHaveProperty('polluted');
    });
  });

  describe('Compatibility with existing header helpers', () => {
    it('should use same encoding format as payment header helpers', () => {
      const response = validResponse;
      const encoded = encodePaymentResponseHeader(response);

      // Should be valid base64
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      // Should be valid JSON
      const parsed = JSON.parse(decoded);

      expect(parsed).toEqual(response);
    });

    it('should be distinguishable from payment payload headers', () => {
      const response = validResponse;
      const encoded = encodePaymentResponseHeader(response);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);

      // Should have response-specific structure
      expect(parsed).toHaveProperty('accepts');
      expect(parsed).toHaveProperty('error');
      expect(parsed).toHaveProperty('x402Version');

      // Should not have payload-specific structure
      expect(parsed).not.toHaveProperty('scheme');
      expect(parsed).not.toHaveProperty('payload');
    });
  });
});
