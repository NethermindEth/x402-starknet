# Security Policy

## Overview

The `@x402/starknet` library implements the x402 payment protocol for Starknet, enabling micropayments for digital resources. This document outlines the security model, threat assumptions, known limitations, and best practices for secure usage.

**Library Version**: 0.1.0
**Last Security Review**: 2025-11-09
**Status**: Experimental - Use with caution in production

---

## Threat Model

### What This Library Protects Against

✅ **Invalid Payment Payloads**
- Schema validation via Zod ensures payload structure correctness
- Rejects malformed or missing required fields

✅ **Insufficient Balance Attacks**
- Balance checking before settlement prevents overdraft attempts
- Returns clear error codes for insufficient funds

✅ **Amount Manipulation**
- Strict equality checks ensure payment amounts match requirements exactly
- No tolerance for amount discrepancies

✅ **Network Mismatch**
- Validates payment network matches server requirements
- Prevents cross-network payment attempts

✅ **Token/Recipient Manipulation**
- Validates token address and recipient match requirements
- Ensures payments go to intended destination

### What This Library Does NOT Protect Against

❌ **Signature Replay Attacks (Partially)**
- The library does NOT cryptographically verify signatures during `verifyPayment()`
- Signature verification happens implicitly during paymaster execution
- Applications must implement additional replay protection if needed
- **Mitigation**: Starknet's built-in nonce system prevents transaction replay, but the same signed payload could be submitted multiple times before settlement

❌ **Time-of-Check-Time-of-Use (TOCTOU) Race Conditions**
- Balance is checked during verification but could change before settlement
- Window between `verifyPayment()` and `settlePayment()` is vulnerable
- **Mitigation**: Keep verification and settlement calls as close as possible; implement additional locking if needed

❌ **Malicious RPC Providers**
- Library trusts RPC provider responses (balance, transaction status)
- Compromised RPC could return false data
- **Mitigation**: Use trusted RPC endpoints; consider running your own node

❌ **Malicious Paymaster Endpoints**
- Library trusts paymaster endpoint provided in configuration
- Malicious paymaster could steal signatures or fail to execute transactions
- **Mitigation**: Only use trusted paymaster services (e.g., AVNU); validate endpoint URLs

❌ **Front-Running Attacks**
- Settlement transactions can be front-run on-chain
- Paymaster relayer could potentially manipulate transaction ordering
- **Mitigation**: Use reputable paymaster services with fair ordering policies

❌ **Denial of Service**
- Library does not implement rate limiting or DoS protection
- Applications must implement their own rate limiting
- **Mitigation**: Add application-layer rate limiting for verification/settlement calls

❌ **Information Disclosure via Error Messages**
- Error messages may leak sensitive information (balance amounts, addresses)
- Error details returned in verification responses could aid attackers
- **Mitigation**: Sanitize error messages before exposing to clients; log detailed errors server-side only

---

## Security Assumptions

This library operates under the following security assumptions:

### 1. Trusted Infrastructure

**Assumption**: The application using this library runs on trusted infrastructure.
- Server-side settlement code is not compromised
- Private keys for signing are securely managed (not handled by this library)
- Environment variables and configuration are protected

### 2. Trusted RPC Provider

**Assumption**: The Starknet RPC provider is honest and returns accurate data.
- Balance queries return correct balances
- Transaction receipts are authentic
- Network state is accurate

**Recommendation**: Use multiple RPC providers and cross-check critical data.

### 3. Trusted Paymaster Service

**Assumption**: The paymaster service (e.g., AVNU) is honest and will:
- Execute transactions as submitted
- Not steal or misuse signatures
- Pay gas fees as promised in sponsored mode
- Not manipulate transaction ordering maliciously

**Recommendation**: Only use audited, reputable paymaster services.

### 4. Starknet Security Model

**Assumption**: Starknet's base layer provides:
- Nonce-based replay protection
- Valid signature verification on-chain
- Secure execution environment
- Finality guarantees

### 5. Client-Side Security

**Assumption**: Clients properly manage their private keys (via wallets like Argent, Braavos).
- This library does NOT handle private key management
- Signature creation happens in user's wallet
- Wallet software is not compromised

---

## Known Security Limitations

### 1. No Signature Verification in `verifyPayment()`

**Location**: `src/payment/verify.ts:120-122`

**Issue**: The `verifyPayment()` function does NOT cryptographically verify the signature. It only checks payload structure, network, amounts, and balance.

**Rationale**: Signature verification happens implicitly when the paymaster executes the transaction. If the signature is invalid, execution will fail on-chain.

**Risk**:
- Invalid signatures are not caught until settlement
- Wastes gas on failed settlement attempts
- Could be used for DoS if attacker submits many invalid signatures

**Mitigation**:
- Applications should track failed settlements and rate-limit repeat offenders
- Consider implementing explicit signature verification before settlement if needed
- Future library versions may add optional signature verification

**Code Reference**:
```typescript
// src/payment/verify.ts:120-122
// Note: We don't cryptographically verify the signature here.
// The signature will be implicitly verified when executing via paymaster.
// If the signature is invalid, the paymaster execution will fail.
```

### 2. TOCTOU Race Condition

**Location**: `src/payment/settle.ts:56-71`

**Issue**: Balance is checked in `verifyPayment()` but the transaction is executed later in `settlePayment()`. Balance could decrease between these calls.

**Risk**:
- Settlement could fail even after successful verification
- User could double-spend if timing is exploited

**Mitigation**:
- Minimize time between verification and settlement
- Implement idempotency keys to prevent duplicate settlements
- Consider implementing pessimistic locking at application layer

### 3. Error Information Disclosure

**Location**: `src/payment/verify.ts:114-116`, `src/errors.ts:50-51`

**Issue**: Error messages include sensitive details like exact balance amounts:
```typescript
// Reveals exact balance
return {
  isValid: false,
  invalidReason: 'insufficient_balance',
  payer,
  details: { balance },
};

// Error factory includes amounts
`Insufficient balance: required ${required}, available ${available}`
```

**Risk**:
- Attackers can probe user balances
- Privacy violation for users

**Mitigation**:
- Sanitize error messages before returning to clients
- Log detailed errors server-side only
- Return generic error messages to untrusted clients

### 4. No Input Sanitization in Encoding/Decoding

**Location**: `src/payment/create.ts:175-194`

**Issue**: `decodePaymentHeader()` uses `JSON.parse()` without additional validation:
```typescript
export function decodePaymentHeader(encoded: string): PaymentPayload {
  const json = Buffer.from(encoded, 'base64').toString('utf-8');
  return JSON.parse(json) as PaymentPayload; // Type assertion, no runtime validation
}
```

**Risk**:
- Malformed JSON could cause parsing errors
- Prototype pollution attacks (unlikely but possible)
- No validation that decoded data matches PaymentPayload schema

**Mitigation**:
- Always pass decoded payloads through `verifyPayment()` which uses Zod validation
- Never trust decoded payloads without validation
- Consider adding explicit schema validation in `decodePaymentHeader()`

### 5. Paymaster Endpoint Trust

**Location**: `src/payment/create.ts:96`, `src/payment/settle.ts:79-84`

**Issue**: Library accepts arbitrary paymaster endpoints without validation:
```typescript
const paymasterEndpoint =
  options?.paymasterConfig?.endpoint ?? payloadWithExtras.paymasterEndpoint;
```

**Risk**:
- Malicious clients could specify fake paymaster endpoints
- Signatures could be stolen by malicious paymaster
- Transactions might not be executed as intended

**Mitigation**:
- Application should whitelist allowed paymaster endpoints
- Validate endpoint URLs against known good services
- Use DEFAULT_PAYMASTER_ENDPOINTS constant for trusted endpoints

---

## Best Practices for Secure Usage

### Server-Side (Facilitator)

1. **Always Verify Before Settling**
   ```typescript
   const verification = await verifyPayment(provider, payload, requirements);
   if (!verification.isValid) {
     // Log reason but don't expose details to client
     logger.error('Verification failed', { reason: verification.invalidReason });
     return { error: 'Payment verification failed' }; // Generic message
   }
   ```

2. **Sanitize Error Messages**
   ```typescript
   // ❌ DON'T expose detailed errors to clients
   return { error: verification.invalidReason, details: verification.details };

   // ✅ DO log details server-side, return generic errors
   logger.error('Payment failed', verification);
   return { error: 'Payment could not be processed' };
   ```

3. **Use Trusted RPC Providers**
   ```typescript
   const provider = new RpcProvider({
     nodeUrl: process.env.TRUSTED_RPC_URL, // Use your own node or trusted provider
   });
   ```

4. **Whitelist Paymaster Endpoints**
   ```typescript
   const ALLOWED_PAYMASTERS = [
     'https://starknet.paymaster.avnu.fi',
     'https://sepolia.paymaster.avnu.fi',
   ];

   if (!ALLOWED_PAYMASTERS.includes(paymasterConfig.endpoint)) {
     throw new Error('Untrusted paymaster endpoint');
   }
   ```

5. **Implement Rate Limiting**
   ```typescript
   // Limit verification attempts per IP/user
   if (await rateLimiter.isRateLimited(clientIp)) {
     return { error: 'Too many requests' };
   }
   ```

6. **Implement Idempotency**
   ```typescript
   // Prevent duplicate settlements
   const idempotencyKey = hash(payload);
   if (await isAlreadySettled(idempotencyKey)) {
     return { error: 'Payment already processed' };
   }
   ```

7. **Minimize Verification-Settlement Gap**
   ```typescript
   // ✅ DO verify and settle together
   const verification = await verifyPayment(provider, payload, requirements);
   if (verification.isValid) {
     return settlePayment(provider, payload, requirements);
   }

   // ❌ DON'T separate by long delays
   await verifyPayment(...);
   await sleep(60000); // Long delay - balance could change!
   await settlePayment(...);
   ```

### Client-Side

1. **Use Default Paymaster Endpoints**
   ```typescript
   import { DEFAULT_PAYMASTER_ENDPOINTS } from '@x402/starknet';

   const payload = await createPaymentPayload(account, 1, requirements, {
     endpoint: DEFAULT_PAYMASTER_ENDPOINTS['starknet-sepolia'],
     network: 'starknet-sepolia',
   });
   ```

2. **Validate Server Responses**
   ```typescript
   const response = await fetch(url, {
     headers: { 'X-Payment': encodePaymentHeader(payload) },
   });

   if (response.status !== 200) {
     // Handle errors gracefully
     const error = await response.json();
     console.error('Payment failed:', error.message); // Don't expose to user
   }
   ```

3. **Handle Wallet Errors**
   ```typescript
   try {
     const payload = await createPaymentPayload(...);
   } catch (error) {
     if (error.message.includes('User rejected')) {
       // User cancelled - handle gracefully
     } else {
       // Unexpected error - report to monitoring
     }
   }
   ```

---

## Security Testing Checklist

See [SECURITY_TESTING.md](./SECURITY_TESTING.md) for comprehensive security testing guidelines.

**Quick Checklist**:
- [ ] Test with invalid signatures
- [ ] Test with insufficient balance
- [ ] Test with manipulated amounts
- [ ] Test with wrong network
- [ ] Test with wrong token/recipient
- [ ] Test TOCTOU race conditions
- [ ] Test with malformed payloads
- [ ] Verify error messages don't leak sensitive data
- [ ] Test with untrusted RPC providers
- [ ] Test rate limiting implementation

---

## Vulnerability Reporting

We take security seriously. If you discover a security vulnerability in `@x402/starknet`, please report it responsibly.

### Reporting Process

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead:

1. **Email**: Send details to [security contact - to be added]
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Response Time**: We aim to acknowledge within 48 hours
4. **Disclosure**: We will coordinate responsible disclosure after a fix is available

### Scope

**In Scope**:
- Authentication/authorization bypass
- Signature verification issues
- Balance check bypass
- Amount manipulation
- Payment replay attacks
- Information disclosure
- Denial of service (if severe)

**Out of Scope**:
- Issues in dependencies (report to upstream)
- Starknet protocol vulnerabilities (report to Starknet)
- Paymaster service vulnerabilities (report to AVNU)
- Social engineering attacks
- Physical attacks

---

## Security Roadmap

Future security enhancements planned:

- [ ] Optional explicit signature verification in `verifyPayment()`
- [ ] Paymaster endpoint allowlist configuration
- [ ] Enhanced error message sanitization
- [ ] Built-in rate limiting utilities
- [ ] Security audit by third-party firm (before v1.0.0)
- [ ] Formal verification of critical functions
- [ ] Runtime schema validation in `decodePaymentHeader()`
- [ ] TOCTOU mitigation strategies documentation

---

## References

- [Starknet Security Documentation](https://docs.starknet.io/security)
- [AVNU Paymaster Security](https://docs.avnu.fi/paymaster/security)
- [x402 Protocol Specification](https://github.com/x402/specs)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: 2025-11-09
**Next Review**: Before v1.0.0 release
