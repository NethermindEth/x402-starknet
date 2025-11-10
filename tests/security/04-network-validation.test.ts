/**
 * Security Test Suite: Network Validation
 * Based on SECURITY_TESTING.md sections 4.1-4.2
 */

import { describe, it, expect, vi } from 'vitest';
import { verifyPayment } from '../../src/payment/verify.js';
import type {
  PaymentPayload,
  PaymentRequirements,
} from '../../src/types/index.js';
import type { RpcProvider } from 'starknet';

describe('Security: Network Validation', () => {
  const USDC_ADDRESS =
    '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
  const RECIPIENT_ADDRESS =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  const mockProvider: RpcProvider = {
    callContract: vi.fn().mockResolvedValue(['2000000', '0']),
  } as unknown as RpcProvider;

  describe('Test 4.1: Network Mismatch Detection', () => {
    it('should reject cross-network payment (sepolia -> mainnet)', async () => {
      const sepoliaPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      const mainnetRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-mainnet', // Different network
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        sepoliaPayload,
        mainnetRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });

    it('should reject cross-network payment (mainnet -> sepolia)', async () => {
      const mainnetPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-mainnet',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      const sepoliaRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia', // Different network
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        mainnetPayload,
        sepoliaRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });

    it('should accept matching networks (sepolia -> sepolia)', async () => {
      const sepoliaPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      const sepoliaRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        sepoliaPayload,
        sepoliaRequirements
      );

      expect(result.isValid).toBe(true);
    });

    it('should accept matching networks (mainnet -> mainnet)', async () => {
      const mainnetPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-mainnet',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      const mainnetRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-mainnet',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        mainnetPayload,
        mainnetRequirements
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject devnet payment on mainnet requirements', async () => {
      const devnetPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-devnet',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      const mainnetRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-mainnet',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        devnetPayload,
        mainnetRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });
  });

  describe('Test 4.2: Unsupported Network', () => {
    it('should reject unsupported network name', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-foo', // Invalid network
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      // Schema validation should reject this
      expect(result.isValid).toBe(false);
    });

    it('should reject empty network name', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: '', // Empty
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      expect(result.isValid).toBe(false);
    });

    it('should reject null network', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: null, // Null
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      expect(result.isValid).toBe(false);
    });

    it('should reject network with wrong case', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'STARKNET-SEPOLIA', // Wrong case
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      // Should be case-sensitive
      expect(result.isValid).toBe(false);
    });

    it('should reject ethereum network', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'ethereum-mainnet', // Wrong blockchain
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('Edge Cases: Network Validation', () => {
    it('should handle network field missing from payload', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        // network: missing
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });

    it('should handle undefined network', async () => {
      const invalidPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: undefined,
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      } as any;

      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const result = await verifyPayment(
        mockProvider,
        invalidPayload,
        requirements
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('Security: Cross-Network Replay Prevention', () => {
    it('should prevent replay attack across networks', async () => {
      // Attacker tries to replay sepolia signature on mainnet
      const sepoliaPayload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          signature: {
            r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          },
          authorization: {
            from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            to: RECIPIENT_ADDRESS,
            amount: '1000000',
            token: USDC_ADDRESS,
            nonce: '0x0',
            validUntil: '9999999999',
          },
        },
      };

      // Verify on sepolia - should work
      const sepoliaRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const sepoliaResult = await verifyPayment(
        mockProvider,
        sepoliaPayload,
        sepoliaRequirements
      );
      expect(sepoliaResult.isValid).toBe(true);

      // Try to use same signature on mainnet - should fail
      const mainnetRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-mainnet',
        maxAmountRequired: '1000000',
        asset: USDC_ADDRESS,
        payTo: RECIPIENT_ADDRESS,
        resource: 'https://example.com/resource',
      };

      const mainnetResult = await verifyPayment(
        mockProvider,
        sepoliaPayload,
        mainnetRequirements
      );
      expect(mainnetResult.isValid).toBe(false);
      expect(mainnetResult.invalidReason).toBe('invalid_network');
    });
  });
});
