import { describe, it, expect, vi } from 'vitest';
import {
  verifyPayment,
  extractPayerAddress,
} from '../../src/payment/verify.js';
import type {
  PaymentPayload,
  PaymentRequirements,
} from '../../src/types/index.js';
import type { RpcProvider } from 'starknet';

describe('Payment Verification', () => {
  const mockPaymentRequirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'starknet-sepolia',
    maxAmountRequired: '1000000',
    asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    payTo: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    resource: 'https://example.com/api/data',
  };

  const mockPayload: PaymentPayload = {
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
        to: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        amount: '1000000',
        token:
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        nonce: '0x0',
        validUntil: '9999999999',
      },
    },
  };

  describe('extractPayerAddress', () => {
    it('should extract payer from authorization', () => {
      const payer = extractPayerAddress(mockPayload);
      expect(payer).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify valid payment with sufficient balance', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['2000000', '0']), // Balance: 2M (> 1M required)
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(true);
      expect(result.payer).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
      expect(result.details?.balance).toBe('2000000');
    });

    it('should reject payment with insufficient balance', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['500000', '0']), // Balance: 500K (< 1M required)
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('insufficient_balance');
      expect(result.payer).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
      expect(result.details?.balance).toBe('500000');
    });

    it('should reject payment with wrong network', async () => {
      const mockProvider = {} as RpcProvider;

      const wrongNetworkPayload: PaymentPayload = {
        ...mockPayload,
        network: 'starknet-mainnet', // Different from requirement (sepolia)
      };

      const result = await verifyPayment(
        mockProvider,
        wrongNetworkPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });

    it('should verify when scheme matches (both exact)', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['2000000', '0']), // Sufficient balance
      } as unknown as RpcProvider;

      const wrongSchemeRequirements: PaymentRequirements = {
        ...mockPaymentRequirements,
        scheme: 'exact' as const,
      };

      // Both payload and requirements have 'exact' scheme
      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        wrongSchemeRequirements
      );

      // Should pass since both are 'exact' and balance is sufficient
      expect(result.isValid).toBe(true);
    });

    it('should reject payment with wrong token', async () => {
      const mockProvider = {} as RpcProvider;

      const wrongTokenPayload: PaymentPayload = {
        ...mockPayload,
        payload: {
          ...mockPayload.payload,
          authorization: {
            ...mockPayload.payload.authorization,
            token:
              '0x999999999999999999999999999999999999999999999999999999999999999', // Different token
          },
        },
      };

      const result = await verifyPayment(
        mockProvider,
        wrongTokenPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_network');
    });

    it('should reject payment with wrong recipient', async () => {
      const mockProvider = {} as RpcProvider;

      const wrongRecipientPayload: PaymentPayload = {
        ...mockPayload,
        payload: {
          ...mockPayload.payload,
          authorization: {
            ...mockPayload.payload.authorization,
            to: '0x888888888888888888888888888888888888888888888888888888888888888', // Different recipient
          },
        },
      };

      const result = await verifyPayment(
        mockProvider,
        wrongRecipientPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_amount');
    });

    it('should reject payment with wrong amount', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['5000000', '0']),
      } as unknown as RpcProvider;

      const wrongAmountPayload: PaymentPayload = {
        ...mockPayload,
        payload: {
          ...mockPayload.payload,
          authorization: {
            ...mockPayload.payload.authorization,
            amount: '500000', // Different from requirement (1M)
          },
        },
      };

      const result = await verifyPayment(
        mockProvider,
        wrongAmountPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('invalid_amount');
    });

    it('should handle provider errors gracefully', async () => {
      const mockProvider = {
        callContract: vi.fn().mockRejectedValue(new Error('RPC error')),
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('unknown_error');
      expect(result.details?.error).toBe('RPC error');
    });

    it('should handle zero balance', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['0', '0']),
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(false);
      expect(result.invalidReason).toBe('insufficient_balance');
      expect(result.details?.balance).toBe('0');
    });

    it('should handle exact balance match', async () => {
      const mockProvider = {
        callContract: vi.fn().mockResolvedValue(['1000000', '0']), // Exactly required amount
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(true);
      expect(result.payer).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
    });

    it('should handle large Uint256 balances', async () => {
      const mockProvider = {
        callContract: vi
          .fn()
          .mockResolvedValue(['0xffffffffffffffffffffffffffffffff', '0x1']),
      } as unknown as RpcProvider;

      const result = await verifyPayment(
        mockProvider,
        mockPayload,
        mockPaymentRequirements
      );

      expect(result.isValid).toBe(true);
      expect(result.payer).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      );
      expect(result.details?.balance).toBeDefined();
    });
  });
});
