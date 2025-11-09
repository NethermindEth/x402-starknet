import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPaymentPayload,
  selectPaymentRequirements,
  encodePaymentHeader,
  decodePaymentHeader,
  getDefaultPaymasterEndpoint,
} from '../../src/payment/create.js';
import type {
  PaymentRequirements,
  PaymentPayload,
  PaymasterConfig,
} from '../../src/types/index.js';
import { createMockFetch } from '../helpers/mock-fetch.js';

describe('Payment Creation', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('selectPaymentRequirements', () => {
    const mockRequirements: PaymentRequirements[] = [
      {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: '0xeth',
        payTo: '0xrecipient',
        resource: '/api/data',
      },
      {
        scheme: 'exact',
        network: 'starknet-mainnet',
        maxAmountRequired: '2000000',
        asset: '0xusdc',
        payTo: '0xrecipient2',
        resource: '/api/data',
      },
    ];

    it('should select first compatible requirement', async () => {
      const mockAccount = {} as any;
      const mockProvider = {} as any;

      const selected = await selectPaymentRequirements(
        mockRequirements,
        mockAccount,
        mockProvider
      );

      expect(selected).toEqual(mockRequirements[0]);
    });

    it('should throw if no compatible requirements', () => {
      const mockAccount = {} as any;
      const mockProvider = {} as any;

      expect(() =>
        selectPaymentRequirements([], mockAccount, mockProvider)
      ).toThrow('No payment requirements provided');
    });
  });

  describe('createPaymentPayload', () => {
    it('should create a valid payment payload', async () => {
      const mockTypedData = {
        domain: { name: 'Test' },
        types: {},
        primaryType: 'Invoke',
        message: {},
      };

      // Mock paymaster buildTransaction response
      global.fetch = vi.fn().mockImplementation(
        createMockFetch({
          result: {
            type: 'invoke',
            typed_data: mockTypedData,
            calls: [],
          },
        })
      );

      const mockAccount = {
        address: '0x1234567890abcdef',
        signMessage: vi.fn().mockResolvedValue(['0x1234', '0x5678']),
      } as any;

      const paymentRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        payTo: '0xrecipient',
        resource: '/api/data',
      };

      const paymasterConfig: PaymasterConfig = {
        endpoint: 'https://sepolia.paymaster.avnu.fi',
        network: 'starknet-sepolia',
      };

      const payload = await createPaymentPayload(
        mockAccount,
        1,
        paymentRequirements,
        paymasterConfig
      );

      // Verify payload structure
      expect(payload.x402Version).toBe(1);
      expect(payload.scheme).toBe('exact');
      expect(payload.network).toBe('starknet-sepolia');
      expect(payload.payload.signature).toEqual({
        r: '0x1234',
        s: '0x5678',
      });
      expect(payload.payload.authorization).toEqual({
        from: mockAccount.address,
        to: paymentRequirements.payTo,
        amount: paymentRequirements.maxAmountRequired,
        token: paymentRequirements.asset,
        nonce: '0x0',
        validUntil: '0',
      });

      // Verify account.signMessage was called with typed data
      expect(mockAccount.signMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryType: 'Invoke',
        })
      );
    });

    it('should include paymaster endpoint in payload', async () => {
      global.fetch = vi.fn().mockImplementation(
        createMockFetch({
          result: {
            type: 'invoke',
            typed_data: {
              domain: {},
              types: {},
              primaryType: 'Invoke',
              message: {},
            },
            calls: [],
          },
        })
      );

      const mockAccount = {
        address: '0x1234',
        signMessage: vi.fn().mockResolvedValue(['0x1234', '0x5678']),
      } as any;

      const paymentRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'starknet-sepolia',
        maxAmountRequired: '1000000',
        asset: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        payTo: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        resource: '/api/data',
      };

      const paymasterConfig: PaymasterConfig = {
        endpoint: 'https://sepolia.paymaster.avnu.fi',
        network: 'starknet-sepolia',
      };

      const payload = await createPaymentPayload(
        mockAccount,
        1,
        paymentRequirements,
        paymasterConfig
      );

      // Verify paymaster endpoint is stored for later use
      expect((payload as any).paymasterEndpoint).toBe(
        'https://sepolia.paymaster.avnu.fi'
      );
    });
  });

  describe('encodePaymentHeader', () => {
    it('should encode payment payload to base64', () => {
      const payload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          signature: {
            r: '0xsig_r',
            s: '0xsig_s',
          },
          authorization: {
            from: '0xfrom',
            to: '0xto',
            amount: '1000',
            token: '0xtoken',
            nonce: '0',
            validUntil: '0',
          },
        },
      };

      const encoded = encodePaymentHeader(payload);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);

      // Verify it's valid base64
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      expect(() => JSON.parse(decoded)).not.toThrow();
    });
  });

  describe('decodePaymentHeader', () => {
    it('should decode base64 payment header', () => {
      const payload: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          signature: {
            r: '0xsig_r',
            s: '0xsig_s',
          },
          authorization: {
            from: '0xfrom',
            to: '0xto',
            amount: '1000',
            token: '0xtoken',
            nonce: '0',
            validUntil: '0',
          },
        },
      };

      const encoded = encodePaymentHeader(payload);
      const decoded = decodePaymentHeader(encoded);

      expect(decoded).toEqual(payload);
    });

    it('should handle encode/decode round trip', () => {
      const original: PaymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-mainnet',
        payload: {
          signature: {
            r: '0x123',
            s: '0x456',
          },
          authorization: {
            from: '0xuser',
            to: '0xmerchant',
            amount: '5000000',
            token: '0xusdc',
            nonce: '42',
            validUntil: '1234567890',
          },
        },
      };

      const roundTrip = decodePaymentHeader(encodePaymentHeader(original));
      expect(roundTrip).toEqual(original);
    });
  });

  describe('getDefaultPaymasterEndpoint', () => {
    it('should return mainnet endpoint', () => {
      const endpoint = getDefaultPaymasterEndpoint('starknet-mainnet');
      expect(endpoint).toBe('https://starknet.paymaster.avnu.fi');
    });

    it('should return sepolia endpoint', () => {
      const endpoint = getDefaultPaymasterEndpoint('starknet-sepolia');
      expect(endpoint).toBe('http://localhost:12777');
    });

    it('should return devnet endpoint', () => {
      const endpoint = getDefaultPaymasterEndpoint('starknet-devnet');
      expect(endpoint).toBe('http://localhost:12777');
    });
  });
});
