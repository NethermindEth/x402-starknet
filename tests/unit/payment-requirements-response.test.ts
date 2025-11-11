/**
 * Tests for PaymentRequirementsResponse schema compliance
 * Validates spec compliance with x402 v0.2 Section 5.1
 */

import { describe, it, expect } from 'bun:test';
import { PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA } from '../../src/types/schemas.js';
import type { PaymentRequirementsResponse } from '../../src/types/payment.js';

describe('PaymentRequirementsResponse Schema Compliance', () => {
  describe('Valid PaymentRequirementsResponse objects', () => {
    it('should accept a valid response with all required fields', () => {
      const validResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'X-PAYMENT header is required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
            description: 'Access to premium data',
            maxTimeoutSeconds: 60,
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should accept response with multiple payment options in accepts array', () => {
      const validResponse = {
        x402Version: 1,
        error: 'Payment required for this resource',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
          {
            scheme: 'exact',
            network: 'starknet-mainnet',
            maxAmountRequired: '2000000',
            asset:
              '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
            payTo: '0xabcdef1234567890abcdef1234567890abcdef12',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should accept response with mcp:// resource URL', () => {
      const validResponse = {
        x402Version: 1,
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'mcp://example-server/premium-tool',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid PaymentRequirementsResponse objects', () => {
    it('should reject response missing error field', () => {
      const invalidResponse = {
        x402Version: 1,
        // Missing error field
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('error');
      }
    });

    it('should reject response with empty error string', () => {
      const invalidResponse = {
        x402Version: 1,
        error: '', // Empty error message
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Error message cannot be empty'
        );
      }
    });

    it('should reject response missing accepts field', () => {
      const invalidResponse = {
        x402Version: 1,
        error: 'Payment required',
        // Missing accepts field
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('accepts');
      }
    });

    it('should reject response with empty accepts array', () => {
      const invalidResponse = {
        x402Version: 1,
        error: 'Payment required',
        accepts: [], // Empty array
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject response with wrong x402Version', () => {
      const invalidResponse = {
        x402Version: 2, // Wrong version
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject response using old paymentRequirements field name', () => {
      const invalidResponse = {
        x402Version: 1,
        error: 'Payment required',
        paymentRequirements: [
          // Old field name - should be 'accepts'
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      const result =
        PAYMENT_REQUIREMENTS_RESPONSE_SCHEMA.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('accepts');
      }
    });
  });

  describe('Type safety', () => {
    it('should enforce correct TypeScript types', () => {
      // This test ensures TypeScript compilation catches type errors
      const response: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      expect(response.x402Version).toBe(1);
      expect(response.error).toBe('Payment required');
      expect(response.accepts).toBeArrayOfSize(1);
    });
  });

  describe('Spec compliance notes', () => {
    it('should document field name change from paymentRequirements to accepts', () => {
      // This test documents the breaking change for spec compliance
      // Old format (pre-compliance):
      // { x402Version: 1, paymentRequirements: [...] }
      //
      // New format (spec-compliant):
      // { x402Version: 1, error: "...", accepts: [...] }
      //
      // Ref: x402 v0.2 Section 5.1 - PaymentRequirementsResponse Schema

      const specCompliantResponse: PaymentRequirementsResponse = {
        x402Version: 1,
        error: 'X-PAYMENT header is required',
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '1000000',
            asset:
              '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            payTo: '0x1234567890abcdef1234567890abcdef12345678',
            resource: 'https://api.example.com/data',
          },
        ],
      };

      expect(specCompliantResponse).toHaveProperty('error');
      expect(specCompliantResponse).toHaveProperty('accepts');
      expect(specCompliantResponse).not.toHaveProperty('paymentRequirements');
    });
  });
});
