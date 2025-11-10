/**
 * Test that verifies the public API surface
 * This ensures we only export what we intend to export
 */

import { describe, it, expect } from 'vitest';
import * as publicApi from '../../src/index.js';

describe('Public API Surface', () => {
  it('should export only intended symbols', () => {
    const allExports = Object.keys(publicApi).filter(
      (key) => key !== 'default'
    );

    const expectedExports = [
      // Payment operations
      'createPaymentPayload',
      'verifyPayment',
      'settlePayment',
      // Encoding
      'encodePaymentHeader',
      'decodePaymentHeader',
      // Network utilities
      'getNetworkConfig',
      'getTransactionUrl',
      'getAddressUrl',
      'isTestnet',
      'isMainnet',
      'getSupportedNetworks',
      // Constants
      'VERSION',
      'X402_VERSION',
      'DEFAULT_PAYMASTER_ENDPOINTS',
      'NETWORK_CONFIGS',
      // Error classes (classes are also functions in JS)
      'X402Error',
      'PaymentError',
      'NetworkError',
      'ERROR_CODES',
    ];

    expect(allExports.sort()).toEqual(expectedExports.sort());
  });

  it('should export correct number of symbols', () => {
    const allExports = Object.keys(publicApi).filter(
      (key) => key !== 'default'
    );
    // 11 functions + 4 constants + 3 error classes + 1 ERROR_CODES = 19
    expect(allExports).toHaveLength(19);
  });

  it('should export VERSION constant', () => {
    expect(publicApi.VERSION).toBe('0.1.0');
  });

  it('should export X402_VERSION constant', () => {
    expect(publicApi.X402_VERSION).toBe(1);
  });

  it('should export DEFAULT_PAYMASTER_ENDPOINTS', () => {
    expect(publicApi.DEFAULT_PAYMASTER_ENDPOINTS).toEqual({
      'starknet-mainnet': 'https://starknet.paymaster.avnu.fi',
      'starknet-sepolia': 'http://localhost:12777',
      'starknet-devnet': 'http://localhost:12777',
    });
  });

  it('should export NETWORK_CONFIGS', () => {
    expect(publicApi.NETWORK_CONFIGS).toBeDefined();
    expect(publicApi.NETWORK_CONFIGS['starknet-sepolia']).toBeDefined();
    expect(publicApi.NETWORK_CONFIGS['starknet-mainnet']).toBeDefined();
  });

  it('should export error classes', () => {
    expect(publicApi.X402Error).toBeDefined();
    expect(publicApi.PaymentError).toBeDefined();
    expect(publicApi.NetworkError).toBeDefined();
  });

  it('should export ERROR_CODES', () => {
    expect(publicApi.ERROR_CODES).toEqual({
      EINVALID_INPUT: 'EINVALID_INPUT',
      ENOT_FOUND: 'ENOT_FOUND',
      ETIMEOUT: 'ETIMEOUT',
      ECONFLICT: 'ECONFLICT',
      ECANCELLED: 'ECANCELLED',
      EINTERNAL: 'EINTERNAL',
      ENETWORK: 'ENETWORK',
      EPAYMASTER: 'EPAYMASTER',
    });
  });

  it('error classes should work correctly', () => {
    const paymentError = new publicApi.PaymentError('test', 'EINVALID_INPUT');
    expect(paymentError).toBeInstanceOf(Error);
    expect(paymentError).toBeInstanceOf(publicApi.X402Error);
    expect(paymentError.code).toBe('EINVALID_INPUT');
    expect(paymentError.message).toBe('test');

    const networkError = new publicApi.NetworkError('network test', 'ENETWORK');
    expect(networkError).toBeInstanceOf(Error);
    expect(networkError).toBeInstanceOf(publicApi.X402Error);
    expect(networkError.code).toBe('ENETWORK');
  });

  it('should have stable error factories', () => {
    const insufficientBalance = publicApi.PaymentError.insufficientBalance(
      '100',
      '50'
    );
    expect(insufficientBalance.code).toBe('ECONFLICT');
    expect(insufficientBalance.message).toContain('required 100');
    expect(insufficientBalance.message).toContain('available 50');

    const invalidPayload =
      publicApi.PaymentError.invalidPayload('missing field');
    expect(invalidPayload.code).toBe('EINVALID_INPUT');
    expect(invalidPayload.message).toContain('missing field');

    const unsupportedNetwork =
      publicApi.NetworkError.unsupportedNetwork('starknet-foo');
    expect(unsupportedNetwork.code).toBe('EINVALID_INPUT');
    expect(unsupportedNetwork.message).toContain('starknet-foo');

    const networkMismatch = publicApi.NetworkError.networkMismatch(
      'sepolia',
      'mainnet'
    );
    expect(networkMismatch.code).toBe('ECONFLICT');
    expect(networkMismatch.message).toContain('sepolia');
    expect(networkMismatch.message).toContain('mainnet');
  });
});
