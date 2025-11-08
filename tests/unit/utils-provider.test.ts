import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProvider, retryRpcCall } from '../../src/utils/provider.js';

describe('Provider Utilities', () => {
  describe('createProvider', () => {
    it('should create provider for mainnet', () => {
      const provider = createProvider('starknet-mainnet');
      expect(provider).toBeDefined();
    });

    it('should create provider for sepolia', () => {
      const provider = createProvider('starknet-sepolia');
      expect(provider).toBeDefined();
    });

    it('should create provider for devnet', () => {
      const provider = createProvider('starknet-devnet');
      expect(provider).toBeDefined();
    });
  });

  describe('retryRpcCall', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = retryRpcCall(fn, 3, 1000);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const promise = retryRpcCall(fn, 3, 1000);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const error = new Error('persistent failure');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = retryRpcCall(fn, 3, 1000);
      const expectPromise = expect(promise).rejects.toThrow('persistent failure');
      await vi.runAllTimersAsync();
      await expectPromise;
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce('success');

      const promise = retryRpcCall(fn, 3, 100);

      // First call happens immediately
      expect(fn).toHaveBeenCalledTimes(1);

      // After 100ms (base delay * 2^0)
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // After 200ms more (base delay * 2^1)
      await vi.advanceTimersByTimeAsync(200);
      expect(fn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should not delay after last retry', async () => {
      const error = new Error('fail');
      const fn = vi.fn().mockRejectedValue(error);

      const promise = retryRpcCall(fn, 2, 1000);
      const expectPromise = expect(promise).rejects.toThrow('fail');

      // First call
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call after delay
      await vi.advanceTimersByTimeAsync(1000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Should throw immediately without waiting for another delay
      await expectPromise;
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should work with custom retry count', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockRejectedValueOnce(new Error('fail 4'))
        .mockResolvedValueOnce('success');

      const promise = retryRpcCall(fn, 5, 100);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should work with custom base delay', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const promise = retryRpcCall(fn, 3, 500);

      expect(fn).toHaveBeenCalledTimes(1);

      // Should wait 500ms for first retry
      await vi.advanceTimersByTimeAsync(500);
      expect(fn).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result).toBe('success');
    });
  });
});
