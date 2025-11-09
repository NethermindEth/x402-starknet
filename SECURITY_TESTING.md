# Security Testing Checklist

This document provides comprehensive security testing procedures for the `@x402/starknet` library.

---

## 1. Signature Verification Testing

### Test 1.1: Invalid Signature Detection
**Objective**: Verify that invalid signatures cause settlement failure

**Test Procedure**:
```typescript
// Create valid payload
const validPayload = await createPaymentPayload(account, 1, requirements, config);

// Tamper with signature
const invalidPayload = {
  ...validPayload,
  payload: {
    ...validPayload.payload,
    signature: {
      r: '0xdeadbeef',
      s: '0xcafebabe',
    },
  },
};

// Verify - should pass (no signature check in verify)
const verification = await verifyPayment(provider, invalidPayload, requirements);
expect(verification.isValid).toBe(true); // Known limitation

// Settle - should FAIL
const settlement = await settlePayment(provider, invalidPayload, requirements, options);
expect(settlement.success).toBe(false);
expect(settlement.errorReason).toContain('signature');
```

**Expected Result**: Settlement fails with signature-related error

**Risk if Failed**: Invalid signatures could be accepted, leading to unauthorized payments

---

### Test 1.2: Signature Replay Attack
**Objective**: Ensure same signature cannot be used twice

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// First settlement
const result1 = await settlePayment(provider, payload, requirements, options);
expect(result1.success).toBe(true);

// Attempt replay with same payload
const result2 = await settlePayment(provider, payload, requirements, options);
expect(result2.success).toBe(false); // Starknet nonce should prevent this
```

**Expected Result**: Second settlement fails due to nonce mismatch on-chain

**Risk if Failed**: Double-spending attacks possible

---

## 2. Balance Checking Testing

### Test 2.1: Insufficient Balance Detection
**Objective**: Verify insufficient balance is detected

**Test Procedure**:
```typescript
// Requirements exceed balance
const requirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'starknet-sepolia',
  maxAmountRequired: '1000000000000', // 1 million USDC
  asset: USDC_ADDRESS,
  payTo: RECIPIENT_ADDRESS,
  resource: 'https://example.com/resource',
};

const result = await verifyPayment(provider, payload, requirements);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('insufficient_balance');
```

**Expected Result**: Verification fails with insufficient_balance reason

**Risk if Failed**: Transactions that will fail on-chain are not caught early

---

### Test 2.2: TOCTOU Race Condition
**Objective**: Test time-of-check-time-of-use vulnerability

**Test Procedure**:
```typescript
// Verify with sufficient balance
const verification = await verifyPayment(provider, payload, requirements);
expect(verification.isValid).toBe(true);

// Transfer away all funds to another account
await transferAllFunds(account, otherAccount);

// Now settle - balance check was passed but funds are gone
const settlement = await settlePayment(provider, payload, requirements, options);
// Settlement should fail on-chain, but verify passed
expect(settlement.success).toBe(false);
```

**Expected Result**: Settlement fails despite successful verification

**Risk if Failed**: Race condition exists (known limitation)

**Mitigation**: Applications should minimize gap between verify and settle

---

### Test 2.3: Balance Exactly Equal to Required
**Objective**: Edge case where balance exactly matches requirement

**Test Procedure**:
```typescript
// Arrange: Fund account with exact amount needed
await fundAccount(account, requirements.maxAmountRequired);

// Act
const verification = await verifyPayment(provider, payload, requirements);
const settlement = await settlePayment(provider, payload, requirements, options);

// Assert
expect(verification.isValid).toBe(true);
expect(settlement.success).toBe(true);
```

**Expected Result**: Both verify and settle succeed

**Risk if Failed**: Off-by-one errors in balance comparison

---

## 3. Amount Validation Testing

### Test 3.1: Amount Manipulation Detection
**Objective**: Ensure tampered amounts are rejected

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// Tamper with amount
const tamperedPayload = {
  ...payload,
  payload: {
    ...payload.payload,
    authorization: {
      ...payload.payload.authorization,
      amount: '1', // Changed from original
    },
  },
};

const result = await verifyPayment(provider, tamperedPayload, requirements);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('invalid_amount');
```

**Expected Result**: Verification fails with invalid_amount reason

**Risk if Failed**: Payments for wrong amounts could be accepted

---

### Test 3.2: Large Number Handling
**Objective**: Test with extremely large amounts (u256 max)

**Test Procedure**:
```typescript
const MAX_U256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const requirements: PaymentRequirements = {
  // ...
  maxAmountRequired: MAX_U256,
};

// Should handle without overflow
const result = await verifyPayment(provider, payload, requirements);
```

**Expected Result**: No overflow errors, proper BigInt handling

**Risk if Failed**: Integer overflow vulnerabilities

---

### Test 3.3: Zero Amount
**Objective**: Test edge case of zero payment

**Test Procedure**:
```typescript
const requirements: PaymentRequirements = {
  // ...
  maxAmountRequired: '0',
};

const result = await verifyPayment(provider, payload, requirements);
expect(result.isValid).toBe(true); // Zero amount is valid
```

**Expected Result**: Zero amounts are handled correctly

**Risk if Failed**: Zero amount edge case not handled

---

## 4. Network Validation Testing

### Test 4.1: Network Mismatch Detection
**Objective**: Ensure cross-network payments are rejected

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(
  account,
  1,
  { ...requirements, network: 'starknet-sepolia' },
  config
);

const mainnetRequirements = {
  ...requirements,
  network: 'starknet-mainnet' as const,
};

const result = await verifyPayment(provider, payload, mainnetRequirements);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('invalid_network');
```

**Expected Result**: Verification fails with invalid_network reason

**Risk if Failed**: Cross-network replay attacks possible

---

### Test 4.2: Unsupported Network
**Objective**: Test with network not in NETWORK_CONFIGS

**Test Procedure**:
```typescript
const payload = {
  ...validPayload,
  network: 'starknet-foo' as any, // Invalid network
};

const result = await verifyPayment(provider, payload, requirements);
expect(result.isValid).toBe(false);
```

**Expected Result**: Verification fails due to schema validation

**Risk if Failed**: Undefined behavior with unknown networks

---

## 5. Token and Recipient Validation

### Test 5.1: Wrong Token Detection
**Objective**: Ensure wrong token address is rejected

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// Tamper with token
const tamperedPayload = {
  ...payload,
  payload: {
    ...payload.payload,
    authorization: {
      ...payload.payload.authorization,
      token: '0xwrongtoken',
    },
  },
};

const result = await verifyPayment(provider, tamperedPayload, requirements);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('invalid_network'); // Current error code
```

**Expected Result**: Verification fails

**Risk if Failed**: Payments with wrong token could be accepted

---

### Test 5.2: Wrong Recipient Detection
**Objective**: Ensure wrong recipient address is rejected

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// Tamper with recipient
const tamperedPayload = {
  ...payload,
  payload: {
    ...payload.payload,
    authorization: {
      ...payload.payload.authorization,
      to: '0xwrongrecipient',
    },
  },
};

const result = await verifyPayment(provider, tamperedPayload, requirements);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('invalid_amount'); // Current error code
```

**Expected Result**: Verification fails

**Risk if Failed**: Payments could go to wrong recipient

---

## 6. Input Validation Testing

### Test 6.1: Malformed Payload Structure
**Objective**: Test with missing required fields

**Test Procedure**:
```typescript
const malformedPayload = {
  x402Version: 1,
  scheme: 'exact',
  // Missing network and payload fields
};

const result = await verifyPayment(
  provider,
  malformedPayload as any,
  requirements
);
expect(result.isValid).toBe(false);
expect(result.invalidReason).toBe('invalid_network');
```

**Expected Result**: Verification fails with schema validation error

**Risk if Failed**: Malformed payloads could cause crashes

---

### Test 6.2: JSON Injection in Encoding
**Objective**: Test for JSON injection in decoding

**Test Procedure**:
```typescript
// Malicious payload with prototype pollution attempt
const malicious = JSON.stringify({
  __proto__: { admin: true },
  x402Version: 1,
  // ...
});

const encoded = Buffer.from(malicious).toString('base64');

try {
  const decoded = decodePaymentHeader(encoded);
  // Should not have polluted prototype
  expect((decoded as any).__proto__.admin).toBeUndefined();
} catch (error) {
  // Acceptable to throw on malformed payload
}
```

**Expected Result**: Prototype pollution does not occur

**Risk if Failed**: Prototype pollution vulnerability

---

### Test 6.3: Invalid Base64 Encoding
**Objective**: Test error handling for invalid base64

**Test Procedure**:
```typescript
const invalid = 'not-valid-base64!!!';

expect(() => decodePaymentHeader(invalid)).toThrow();
```

**Expected Result**: Throws error gracefully

**Risk if Failed**: Unhandled errors cause crashes

---

## 7. Error Message Security

### Test 7.1: Balance Information Disclosure
**Objective**: Verify balance amounts are not exposed to untrusted clients

**Test Procedure**:
```typescript
const result = await verifyPayment(provider, payload, requirements);
if (!result.isValid && result.invalidReason === 'insufficient_balance') {
  // Check if balance is in details
  expect(result.details?.balance).toBeDefined(); // Currently exposed

  // In production, applications should NOT return this to clients
  const sanitizedResponse = {
    isValid: result.isValid,
    invalidReason: result.invalidReason,
    // DO NOT include details
  };
}
```

**Expected Result**: Test confirms balance is in response (known issue)

**Risk if Failed**: Balance probing attacks possible

**Mitigation**: Applications must sanitize error responses

---

### Test 7.2: Error Stack Trace Disclosure
**Objective**: Ensure stack traces are not leaked

**Test Procedure**:
```typescript
try {
  await settlePayment(provider, invalidPayload, requirements, options);
} catch (error) {
  const errorResponse = { message: error.message };
  // Should NOT include stack trace in production
  expect(errorResponse).not.toHaveProperty('stack');
}
```

**Expected Result**: Stack traces not exposed to clients

**Risk if Failed**: Internal implementation details leaked

---

## 8. Paymaster Security Testing

### Test 8.1: Malicious Paymaster Endpoint
**Objective**: Test behavior with untrusted paymaster

**Test Procedure**:
```typescript
const maliciousConfig = {
  endpoint: 'https://evil.paymaster.com',
  network: 'starknet-sepolia' as const,
};

// Library should accept this (known limitation)
// Applications must whitelist endpoints
const payload = await createPaymentPayload(
  account,
  1,
  requirements,
  maliciousConfig
);

// Verify this endpoint is stored
expect((payload as any).paymasterEndpoint).toBe(maliciousConfig.endpoint);
```

**Expected Result**: Library accepts any endpoint (known limitation)

**Risk if Failed**: N/A - Applications must implement whitelist

**Mitigation**: Applications should validate paymaster endpoints

---

### Test 8.2: Paymaster Unavailability
**Objective**: Test graceful failure when paymaster is down

**Test Procedure**:
```typescript
const config = {
  endpoint: 'https://nonexistent.paymaster.invalid',
  network: 'starknet-sepolia' as const,
};

try {
  await createPaymentPayload(account, 1, requirements, config);
  fail('Should have thrown error');
} catch (error) {
  expect(error).toBeInstanceOf(PaymasterError);
}
```

**Expected Result**: Throws PaymasterError gracefully

**Risk if Failed**: Unhandled errors cause application crashes

---

## 9. RPC Provider Trust Testing

### Test 9.1: Fake Balance Response
**Objective**: Test behavior when RPC returns fake balance

**Test Procedure**:
```typescript
// Mock RPC provider
const fakeProvider = {
  callContract: jest.fn().mockResolvedValue(['999999999999999', '0']),
  // ...
};

// Verify will pass with fake balance
const result = await verifyPayment(fakeProvider as any, payload, requirements);
expect(result.isValid).toBe(true);

// Known limitation: Library trusts RPC
```

**Expected Result**: Library trusts RPC response (known limitation)

**Risk if Failed**: N/A - Known limitation

**Mitigation**: Use trusted RPC providers

---

## 10. Concurrency and Race Condition Testing

### Test 10.1: Concurrent Settlement Attempts
**Objective**: Test multiple simultaneous settlements of same payload

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// Attempt to settle concurrently
const [result1, result2] = await Promise.all([
  settlePayment(provider, payload, requirements, options),
  settlePayment(provider, payload, requirements, options),
]);

// Only one should succeed (due to nonce on-chain)
const successCount = [result1, result2].filter(r => r.success).length;
expect(successCount).toBe(1);
```

**Expected Result**: Only one settlement succeeds

**Risk if Failed**: Double-spending possible

---

### Test 10.2: Verify During Settlement
**Objective**: Test verify call during ongoing settlement

**Test Procedure**:
```typescript
const payload = await createPaymentPayload(account, 1, requirements, config);

// Start settlement (don't await)
const settlementPromise = settlePayment(provider, payload, requirements, options);

// Verify while settlement is ongoing
const verification = await verifyPayment(provider, payload, requirements);

// Verification should still pass (balance check is async)
expect(verification.isValid).toBe(true);

await settlementPromise;
```

**Expected Result**: Verification passes during settlement

**Risk if Failed**: Locking issues or deadlocks

---

## 11. Integration Testing

### Test 11.1: Full Payment Flow
**Objective**: End-to-end payment flow on testnet

**Test Procedure**:
1. Client creates payment payload
2. Client sends to server with X-Payment header
3. Server decodes and verifies payment
4. Server settles payment
5. Server waits for confirmation
6. Server returns resource with transaction hash

**Expected Result**: Complete flow succeeds

**Risk if Failed**: Integration issues between components

---

### Test 11.2: Failed Payment Recovery
**Objective**: Test error handling and recovery

**Test Procedure**:
1. Submit payment with insufficient balance
2. Verify verification fails gracefully
3. Fund account
4. Retry payment
5. Verify success

**Expected Result**: System recovers from failures

**Risk if Failed**: Poor error handling UX

---

## 12. Performance and DoS Testing

### Test 12.1: Rate Limiting
**Objective**: Ensure application implements rate limiting

**Test Procedure**:
```typescript
// Applications must implement this (library doesn't)
for (let i = 0; i < 1000; i++) {
  const result = await verifyPayment(provider, payload, requirements);
}

// Should be rate-limited by application layer
```

**Expected Result**: Application implements rate limiting

**Risk if Failed**: DoS attacks possible

**Mitigation**: Applications must add rate limiting

---

## Testing Summary

### Critical Tests (Must Pass)
- [ ] Test 1.1: Invalid Signature Detection
- [ ] Test 1.2: Signature Replay Attack
- [ ] Test 2.1: Insufficient Balance Detection
- [ ] Test 3.1: Amount Manipulation Detection
- [ ] Test 4.1: Network Mismatch Detection
- [ ] Test 5.1: Wrong Token Detection
- [ ] Test 5.2: Wrong Recipient Detection
- [ ] Test 6.1: Malformed Payload Structure
- [ ] Test 11.1: Full Payment Flow

### Important Tests (Should Pass)
- [ ] Test 2.2: TOCTOU Race Condition (known limitation)
- [ ] Test 2.3: Balance Exactly Equal
- [ ] Test 3.2: Large Number Handling
- [ ] Test 6.2: JSON Injection
- [ ] Test 7.1: Balance Information Disclosure (known limitation)
- [ ] Test 10.1: Concurrent Settlement Attempts

### Informational Tests (Validate Known Limitations)
- [ ] Test 8.1: Malicious Paymaster Endpoint (mitigation required at app layer)
- [ ] Test 9.1: Fake Balance Response (mitigation required at app layer)
- [ ] Test 12.1: Rate Limiting (mitigation required at app layer)

---

## Running Tests

```bash
# Run all unit tests
bun test

# Run security-focused tests
bun test tests/security/

# Run integration tests (requires testnet)
bun test tests/integration/

# Run with coverage
bun run test:coverage
```

---

**Last Updated**: 2025-11-09
