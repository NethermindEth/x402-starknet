# Starknet.js Library Exploration Report

## Overview
**starknet.js** (v8.7.0) is a comprehensive JavaScript/TypeScript library for interacting with the Starknet blockchain. It provides abstractions for account management, contract interaction, transaction signing, and deployment.

### Key Statistics
- TypeScript-based with full type safety
- Modular architecture with clear separation of concerns
- Supports multiple transaction versions (v0-v3)
- Multi-signer support (default, Ethereum, Ledger)
- Paymaster integration for sponsored transactions

---

## 1. Main Modules and Their Purposes

### Core Modules (from `/src`)

| Module | Purpose |
|--------|---------|
| **account/** | Account abstraction for transaction signing and execution |
| **provider/** | RPC provider for blockchain interaction and querying |
| **contract/** | Smart contract wrapper for ABI-based interaction |
| **signer/** | Transaction and message signing implementations |
| **deployer/** | Contract deployment via Universal Deployer Contract (UDC) |
| **wallet/** | Wallet integration with external providers |
| **paymaster/** | Sponsored transaction support |
| **channel/** | RPC communication layer (RPC 0.8, 0.9) |
| **utils/** | Extensive utility functions for encoding, hashing, transactions |
| **types/** | TypeScript type definitions and interfaces |
| **global/** | Constants, configuration, and logging |

### Module Dependency Graph
```
Contract ← Account ← Provider ← Channel/RPC
  ↓         ↓          ↓
 ABI    Signer    Calldata/Hash Utils
             ↓
        Deployer, Paymaster
```

---

## 2. Key APIs for Contract Interaction

### Contract Interface
**Location:** `/src/contract/interface.ts`

```typescript
export abstract class ContractInterface {
  public abstract abi: Abi;
  public abstract address: string;
  public abstract providerOrAccount: ProviderOrAccount;
  public abstract classHash?: string;

  // Read operations (view functions)
  readonly callStatic!: { [name: string]: AsyncContractFunction };
  
  // State-changing operations (invoke functions)
  readonly functions!: { [name: string]: AsyncContractFunction };
  
  // Fee estimation
  readonly estimateFee!: { [name: string]: ContractFunction };
  
  // Transaction preparation (for batching)
  readonly populateTransaction!: { [name: string]: ContractFunction };

  // Core methods
  public abstract call(method: string, args?: ArgsOrCalldata, options?: CallOptions): Promise<CallResult>;
  public abstract invoke(method: string, args?: ArgsOrCalldata, options?: ExecuteOptions): Promise<InvokeFunctionResponse>;
  public abstract estimate(method: string, args?: ArgsOrCalldata, options?: any): Promise<EstimateFeeResponseOverhead>;
  public abstract populate(method: string, args?: ArgsOrCalldata): Invocation;
  public abstract parseEvents(receipt: GetTransactionReceiptResponse): ParsedEvents;
  public abstract attach(address: string, abi?: Abi): void;
  public abstract isDeployed(): Promise<ContractInterface>;
  public abstract isCairo1(): boolean;
  public abstract getVersion(): Promise<ContractVersion>;
  public abstract withOptions(options: WithOptions): ContractInterface;
  public abstract typedv2<TAbi>(tAbi: TAbi): TypedContractV2<TAbi>;
}
```

**Usage Pattern:**
```typescript
// Create contract instance
const contract = new Contract({
  abi: contractAbi,
  address: contractAddress,
  providerOrAccount: provider // or account for state-changing calls
});

// Read data (view functions)
const balance = await contract.balanceOf(userAddress);

// Call state-changing functions
const txResponse = await contract.transfer(recipient, amount);

// Estimate fees
const feeEstimate = await contract.estimate('transfer', [recipient, amount]);

// Prepare transaction for batching
const invocation = contract.populate('transfer', [recipient, amount]);

// Parse events from receipt
const receipt = await provider.waitForTransaction(txHash);
const events = contract.parseEvents(receipt);
```

---

## 3. Account Management and Signing

### Account Interface
**Location:** `/src/account/interface.ts`

```typescript
export abstract class AccountInterface extends ProviderInterface {
  public abstract address: string;
  public abstract signer: SignerInterface;
  public abstract cairoVersion: CairoVersion;
  public abstract deployer?: DeployerInterface;

  // Transaction execution
  public abstract execute(transactions: AllowArray<Call>, details?: InvocationsDetails): Promise<InvokeFunctionResponse>;
  
  // Fee estimation
  public abstract estimateInvokeFee(calls: AllowArray<Call>, details?: UniversalDetails): Promise<EstimateFeeResponseOverhead>;
  public abstract estimateDeclareFee(payload: DeclareContractPayload, details?: UniversalDetails): Promise<EstimateFeeResponseOverhead>;
  public abstract estimateAccountDeployFee(payload: DeployAccountContractPayload, details?: UniversalDetails): Promise<EstimateFeeResponseOverhead>;
  public abstract estimateDeployFee(payload: UniversalDeployerContractPayload[], details?: UniversalDetails): Promise<EstimateFeeResponseOverhead>;
  public abstract estimateFeeBulk(invocations: Invocations, details?: UniversalDetails): Promise<EstimateFeeResponseBulkOverhead>;
  
  // Contract deployment
  public abstract declare(payload: DeclareContractPayload, details?: InvocationsDetails): Promise<DeclareContractResponse>;
  public abstract deploy(payload: UniversalDeployerContractPayload[], details?: InvocationsDetails): Promise<MultiDeployContractResponse>;
  public abstract deployContract(payload: UniversalDeployerContractPayload[], details?: InvocationsDetails): Promise<DeployContractUDCResponse>;
  public abstract declareAndDeploy(payload: DeclareAndDeployContractPayload, details?: InvocationsDetails): Promise<DeclareDeployUDCResponse>;
  public abstract deployAccount(payload: DeployAccountContractPayload, details?: InvocationsDetails): Promise<DeployContractResponse>;
  
  // Message signing
  public abstract signMessage(typedData: TypedData): Promise<Signature>;
  public abstract hashMessage(typedData: TypedData): Promise<string>;
  
  // Nonce management
  public abstract getNonce(blockIdentifier?: BlockIdentifier): Promise<Nonce>;
  
  // Paymaster
  public abstract estimatePaymasterTransactionFee(calls: Call[], details: PaymasterDetails): Promise<PaymasterFeeEstimate>;
  public abstract executePaymasterTransaction(calls: Call[], details: PaymasterDetails, maxFee?: BigNumberish): Promise<InvokeFunctionResponse>;
}
```

### Account Implementation
**Location:** `/src/account/default.ts`

The `Account` class extends `Provider` and implements `AccountInterface`:

```typescript
export class Account extends Provider implements AccountInterface {
  public signer: SignerInterface;
  public address: string;
  public cairoVersion: CairoVersion;
  readonly transactionVersion: typeof ETransactionVersion.V3;
  public paymaster: PaymasterInterface;
  public deployer: Deployer;

  constructor(options: AccountOptions) {
    const {
      provider,
      address,
      signer,
      cairoVersion,
      transactionVersion,
      paymaster,
      defaultTipType,
    } = options;
    super(provider);
    this.address = address.toLowerCase();
    this.signer = isString(signer) || signer instanceof Uint8Array ? new Signer(signer) : signer;
    // ... configuration
  }
}
```

### Signer Interface
**Location:** `/src/signer/interface.ts`

```typescript
export abstract class SignerInterface {
  public abstract getPubKey(): Promise<string>;
  
  // Message signing (off-chain)
  public abstract signMessage(typedData: TypedData, accountAddress: string): Promise<Signature>;
  
  // Transaction signing
  public abstract signTransaction(transactions: Call[], details: InvocationsSignerDetails): Promise<Signature>;
  public abstract signDeployAccountTransaction(transaction: DeployAccountSignerDetails): Promise<Signature>;
  public abstract signDeclareTransaction(transaction: DeclareSignerDetails): Promise<Signature>;
}
```

### Available Signers
1. **DefaultSigner** (`/src/signer/default.ts`) - Uses private key (ECDSA)
2. **EthSigner** (`/src/signer/ethSigner.ts`) - Ethereum-compatible signing
3. **LedgerSigner** - Multiple versions for different Ledger firmware versions

### Key Signing Patterns

**Message Signing (EIP-712 style):**
```typescript
const typedData = {
  domain: {
    name: 'MyDapp',
    chainId: constants.StarknetChainId.SN_SEPOLIA,
    version: '0.0.1'
  },
  types: {
    StarkNetDomain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'felt' },
      { name: 'version', type: 'string' }
    ],
    Message: [{ name: 'content', type: 'string' }]
  },
  primaryType: 'Message',
  message: { content: 'Hello Starknet!' }
};

const signature = await account.signMessage(typedData);
```

**Transaction Signing (Handled Internally):**
- Signers sign transaction hashes
- Signatures included in transaction invocations
- Account handles nonce management and signature wrapping

---

## 4. Transaction Handling

### Transaction Types Supported
1. **INVOKE** - Call contract functions
2. **DECLARE** - Register contract class
3. **DEPLOY_ACCOUNT** - Deploy account contract
4. **DEPLOY** - Deploy via UDC
5. **L1_HANDLER** - Handle L1 to L2 messages

### Transaction Versions
- **v0** - Legacy
- **v1** - Mainnet (uses wei for fees)
- **v2** - Post-v1
- **v3** - Latest (uses fri/strk for fees, includes resource bounds)

### Transaction Execution Pattern

**Simple Execution:**
```typescript
const { transaction_hash } = await account.execute({
  contractAddress: '0x123...',
  entrypoint: 'transfer',
  calldata: [recipient, amount]
});
```

**Batch Execution:**
```typescript
const calls = [
  {
    contractAddress: tokenAddress,
    entrypoint: 'approve',
    calldata: [spender, amount]
  },
  {
    contractAddress: dexAddress,
    entrypoint: 'swap',
    calldata: [inputToken, outputToken, amount]
  }
];

const { transaction_hash } = await account.execute(calls);
```

**With Fee Estimation:**
```typescript
const feeEstimate = await account.estimateInvokeFee(calls);
console.log('Estimated fee:', feeEstimate.overall_fee);

const { transaction_hash } = await account.execute(calls, {
  resourceBounds: feeEstimate.resourceBounds
});
```

**With Custom Details:**
```typescript
const { transaction_hash } = await account.execute(calls, {
  nonce: 42,
  version: 3,
  resourceBounds: {
    l1_gas: { amount: '0x1000', price: '0x20' },
    l2_gas: { amount: '0x200', price: '0x5' },
    l1_data_gas: { amount: '0x500', price: '0x10' }
  },
  tip: 0,
  paymasterData: [],
  accountDeploymentData: [],
  nonceDataAvailabilityMode: RPC.EDataAvailabilityMode.L1,
  feeDataAvailabilityMode: RPC.EDataAvailabilityMode.L1
});
```

### Call Data Transformation

**Location:** `/src/utils/transaction/transaction.ts`

Key transformation functions:
```typescript
// Transform calls to multicall arrays
export const transformCallsToMulticallArrays = (calls: Call[]) => {
  const callArray: ParsedStruct[] = [];
  const calldata: BigNumberish[] = [];
  // Compiles each call's calldata and tracks offsets
};

// Cairo 0 style execution
export const fromCallsToExecuteCalldata = (calls: Call[]) => {
  // Creates flat calldata for __execute__ entrypoint
};

// Cairo 1 style execution
export const getExecuteCalldata = (calls: Call[], cairoVersion: CairoVersion) => {
  // Handles both Cairo 0 and Cairo 1 formats
};
```

### Fee Estimation Details

**Location:** `/src/account/interface.ts` lines 82-215

Fee estimation includes:
- `overall_fee` - Total fee required
- `resourceBounds` (v3) - Breakdown by resource type
  - `l1_gas` - Layer 1 gas
  - `l2_gas` - Layer 2 gas
  - `l1_data_gas` - L1 data availability
- Configurable skip validation for faster estimation
- Support for priority tips
- Data availability mode selection

---

## 5. Patterns for Building Libraries on Top of starknet.js

### 5.1 Interface-Based Extensibility

The library uses abstract base classes for all major components:

```typescript
// Implement custom provider
export class CustomProvider extends Provider {
  // Override specific methods while inheriting rest
}

// Implement custom signer
export class CustomSigner implements SignerInterface {
  public async getPubKey(): Promise<string> { /* ... */ }
  public async signMessage(typedData: TypedData, accountAddress: string): Promise<Signature> { /* ... */ }
  public async signTransaction(transactions: Call[], details: InvocationsSignerDetails): Promise<Signature> { /* ... */ }
  public async signDeployAccountTransaction(transaction: DeployAccountSignerDetails): Promise<Signature> { /* ... */ }
  public async signDeclareTransaction(transaction: DeclareSignerDetails): Promise<Signature> { /* ... */ }
}

// Implement custom deployer
export class CustomDeployer implements DeployerInterface {
  public buildDeployerCall(payload: UniversalDeployerContractPayload[], address: string): DeployerCall { /* ... */ }
  public parseDeployerEvent(txReceipt: InvokeTransactionReceiptResponse): DeployContractUDCResponse { /* ... */ }
}
```

### 5.2 Account Extension Pattern (WalletAccount Example)

**Location:** `/src/wallet/account.ts`

```typescript
export class WalletAccount extends Account implements AccountInterface {
  public walletProvider: StarknetWalletProvider;

  constructor(options: WalletAccountOptions) {
    super({ ...options, signer: '' });
    this.walletProvider = options.walletProvider;
    
    // Listen to wallet events
    this.walletProvider.on('accountsChanged', (res) => {
      if (!res) return;
      this.address = res[0].toLowerCase();
    });
  }

  // Override execute to use wallet signing
  override execute(calls: AllowArray<Call>) {
    // Delegate to walletProvider.signTransaction
  }

  // Add wallet-specific methods
  public onAccountChange(callback: AccountChangeEventHandler): void { /* ... */ }
  public requestAccounts(silentMode = false) { /* ... */ }
  public getPermissions() { /* ... */ }
}
```

### 5.3 Contract Wrapper Pattern

```typescript
// Create domain-specific contract wrapper
export class TokenContract extends Contract {
  constructor(address: string, provider: ProviderInterface) {
    super({
      abi: ERC20_ABI,
      address,
      providerOrAccount: provider
    });
  }

  async getBalance(account: string): Promise<bigint> {
    const result = await this.call('balanceOf', [account]);
    return BigInt(result);
  }

  async transfer(account: AccountInterface, to: string, amount: BigNumberish): Promise<InvokeFunctionResponse> {
    const contract = this.attach(this.address);
    contract.providerOrAccount = account;
    return this.invoke('transfer', [to, amount]);
  }
}
```

### 5.4 Transaction Builder Pattern

**Location:** `/src/utils/transaction/transaction.ts` & `/src/utils/calldata/index.ts`

```typescript
// Use CallData for ABI-driven transaction building
const callData = new CallData(contractAbi);

// Validate and compile arguments
callData.validate(ValidateType.INVOKE, 'transfer', { to, amount });
const compiled = callData.compile('transfer', { to, amount });

// Or use raw encoding
const rawCalls = [
  {
    contractAddress: tokenAddress,
    entrypoint: 'transfer',
    calldata: [recipient, amount]
  }
];
```

### 5.5 Utility Function Reuse

Key utility modules for library building:

| Module | Exports | Use Case |
|--------|---------|----------|
| `utils/hash/` | `calculateContractAddressFromHash`, `getSelectorFromName`, `starknetKeccak` | Address computation, function selection |
| `utils/num/` | `toHex`, `toBigInt`, `hexToDecimalString`, `bigNumberishArrayToHexadecimalStringArray` | Number conversions |
| `utils/encode/` | `encode`, `decode`, `buf2hex`, `addHexPrefix` | Encoding operations |
| `utils/calldata/` | `CallData`, `cairo` data type helpers | ABI interaction |
| `utils/stark/` | `compressProgram`, `decompressProgram`, `signatureToHexArray` | Program/signature handling |
| `utils/ec/` | `starkCurve` elliptic curve operations | Cryptography |
| `utils/json/` | `parse`, `stringify` | JSON with BigInt support |
| `utils/shortString/` | `encodeShortString`, `decodeShortString` | Short string encoding |
| `utils/transaction/` | `transformCallsToMulticallArrays`, `getExecuteCalldata` | Transaction formatting |
| `utils/events/` | `getAbiEvents`, `parseEvents` | Event parsing |
| `utils/merkle/` | Merkle tree operations | Proof verification |

### 5.6 Configuration and Constants

**Location:** `/src/global/constants.ts`

Access via:
```typescript
import { constants } from 'starknet';

// Chain IDs
constants.StarknetChainId.SN_MAIN
constants.StarknetChainId.SN_SEPOLIA

// Transaction versions
ETransactionVersion.V3

// UDC addresses
constants.UDC.ADDRESS
constants.UDC.ENTRYPOINT

// Data types
constants.TEXT_TO_FELT_MAX_LEN // 31
constants.PRIME // Starknet field prime
constants.ADDR_BOUND // Max storage address
```

### 5.7 Provider Interface Pattern

```typescript
export abstract class ProviderInterface {
  public abstract channel: RPC08.RpcChannel | RPC09.RpcChannel;
  public abstract responseParser: RPCResponseParser;

  // Core read operations
  public abstract getChainId(): Promise<StarknetChainId>;
  public abstract callContract(call: Call, blockIdentifier?: BlockIdentifier): Promise<CallContractResponse>;
  public abstract getBlock(blockIdentifier?: BlockIdentifier): Promise<GetBlockResponse>;
  public abstract getClassAt(contractAddress: BigNumberish, blockIdentifier?: BlockIdentifier): Promise<ContractClassResponse>;
  public abstract getStorageAt(contractAddress: BigNumberish, key: BigNumberish, blockIdentifier?: BlockIdentifier): Promise<Storage>;
  public abstract getTransaction(transactionHash: BigNumberish): Promise<GetTransactionResponse>;
  public abstract getTransactionReceipt(transactionHash: BigNumberish): Promise<GetTransactionReceiptResponse>;
  
  // Fee estimation
  public abstract estimateFeeBulk(invocations: Invocations, details?: any): Promise<EstimateFeeResponseBulkOverhead>;
  
  // Transaction submission
  public abstract invokeFunction(invocation: Invocation, details: InvocationsDetailsWithNonce): Promise<InvokeFunctionResponse>;
  public abstract declareContract(transaction: DeclareContractTransaction, details: InvocationsDetailsWithNonce): Promise<DeclareContractResponse>;
  public abstract deployAccountContract(payload: DeployAccountContractPayload, details: InvocationsDetailsWithNonce): Promise<DeployContractResponse>;
  
  // Waiting for transactions
  public abstract waitForTransaction(txHash: BigNumberish, options?: waitForTransactionOptions): Promise<GetTransactionReceiptResponse>;
}
```

### 5.8 Response Parsing Pattern

**Location:** `/src/utils/responseParser/`

```typescript
// Parse provider responses into typed objects
const response = await provider.getTransaction(txHash);
const parsedResponse = provider.responseParser.parseGetTransactionResponse(response);

// Custom parsing for domain-specific types
class DomainResponseParser extends ResponseParser {
  parseCustomResponse(response: RawResponse): CustomType {
    // Custom parsing logic
  }
}
```

### 5.9 Typed Contract Pattern

Using `abi-wan-kanabi` for compile-time type safety:

```typescript
// Define typed ABI (with proper TypeScript types)
type ERC20 = {
  balance_of: (account: string) => Promise<bigint>;
  transfer: (to: string, amount: bigint) => Promise<any>;
};

// Get typed contract instance
const typedContract = contract.typedv2<ERC20>(erc20Abi);

// Full TypeScript support
const balance = await typedContract.balance_of(userAddress);
await typedContract.transfer(recipient, amount);
```

---

## 6. Key Design Patterns and Best Practices

### 6.1 Composition Over Inheritance
- Account composes Provider, Signer, Deployer
- Contract uses Provider or Account (duck typing via ProviderOrAccount)
- Account can replace signer at runtime

### 6.2 Interface Segregation
- Separate interfaces for different concerns
- Consumers depend on interfaces, not implementations
- Easy to mock for testing

### 6.3 Factory Pattern
- `Provider.create()` for standard provider instantiation
- `Account` constructor accepts provider options or provider instance
- Contract handles both Provider and Account transparently

### 6.4 Error Handling
- Custom error types in `/src/types/errors.ts`
- `LibraryError` for library-specific issues
- `RpcError` for RPC failures
- Validation errors for ABI mismatches

### 6.5 Type Safety
- Full TypeScript coverage (95%+ coverage target)
- Branded types for distinguishing similar values
- Discriminated unions for transaction types
- Generic types for flexibility

### 6.6 Utility Function Organization
- Organized by concern (hash, encode, calldata, etc.)
- Tree-shakeable exports
- Pure functions where possible
- Memoization for expensive operations (e.g., ABI parsing)

---

## 7. Important Constants and Addresses

```typescript
// UDC (Universal Deployer Contract)
const UDC_ADDRESS = '0x02ceed65a4bd731034c01113685c831b01c15d7d432f71afb1cf1634b53a2125';
const UDC_ENTRYPOINT = 'deploy_contract';

// Chain IDs
const SN_MAIN = 'SN_MAIN';
const SN_SEPOLIA = 'SN_SEPOLIA';

// Transaction versions (use v3 for latest)
const V3 = '0x3';

// Data availability modes
const L1 = 0;
const L2 = 1;

// Cairo Felt maximum length
const TEXT_TO_FELT_MAX_LEN = 31;

// Starknet field prime
const PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n;
```

---

## 8. Summary: Building on starknet.js

**Recommended Approach for New Libraries:**

1. **Extend Account** for wallet-like functionality
   - Add domain-specific transaction methods
   - Implement custom signing strategies
   - Add convenience methods for common patterns

2. **Wrap Contract** for domain-specific interactions
   - Provide type-safe contract methods
   - Add validation and transformation
   - Handle event parsing automatically

3. **Implement Custom Signers** for new signing mechanisms
   - Hardware wallets
   - Multi-signature schemes
   - Session-based signing

4. **Use Utility Functions** for core operations
   - Hash computation
   - Encoding/decoding
   - Call data transformation
   - Number conversions

5. **Leverage Type System** for safety
   - Use branded types for domain values
   - Create discriminated unions for variants
   - Generate types from ABIs

6. **Integrate Response Parsing** for custom types
   - Extend ResponseParser for domain types
   - Add validation and transformation
   - Handle version-specific responses

**Key Interfaces to Implement:**
- `SignerInterface` - Custom signing
- `ProviderInterface` - Custom RPC or caching layer
- `DeployerInterface` - Custom deployment logic
- `PaymasterInterface` - Custom fee handling

