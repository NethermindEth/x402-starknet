# Starknet.js - Quick Reference Guide

## Installation & Setup

```typescript
import { 
  Account, 
  Contract, 
  Provider, 
  Signer,
  CallData,
  constants,
  hash,
  num,
  ec,
  stark
} from 'starknet';

// Create provider
const provider = new Provider({
  nodeUrl: 'https://starknet-mainnet.public.blastapi.io'
});

// Or with RPC options
import { RpcProvider } from 'starknet';
const rpcProvider = new RpcProvider({
  nodeUrl: 'https://starknet-mainnet.public.blastapi.io',
  specVersion: '0.9'
});
```

## Account Management

### Create Account

```typescript
// With private key
const account = new Account({
  address: '0x1234567890abcdef...',
  signer: new Signer('0x123456...'), // private key
  provider,
  cairoVersion: '1'  // or '0'
});

// Or with private key string directly
const account = new Account({
  address: '0x1234567890abcdef...',
  signer: '0x123456...', // Signer created internally
  provider
});
```

### Get Public Key

```typescript
const publicKey = await account.signer.getPubKey();
```

### Get Account Nonce

```typescript
const nonce = await account.getNonce();
const nonceAtLatest = await account.getNonce('latest');
```

## Contract Interaction

### Create Contract Instance

```typescript
const contract = new Contract({
  abi: contractAbi,
  address: contractAddress,
  providerOrAccount: provider  // for read-only
  // OR
  providerOrAccount: account   // for state-changing calls
});
```

### Read from Contract (View Functions)

```typescript
// Direct method call
const balance = await contract.balanceOf(userAddress);

// Using call method
const result = await contract.call('balanceOf', [userAddress]);

// Using callStatic
const result = await contract.callStatic.balanceOf(userAddress);
```

### State-Changing Calls

```typescript
// Direct method call
const response = await contract.transfer(recipient, amount);
const txHash = response.transaction_hash;

// Using invoke method
const response = await contract.invoke('transfer', [recipient, amount]);

// With execution options
const response = await contract.invoke('transfer', [recipient, amount], {
  nonce: 5,
  maxFee: '1000000000000000'
});
```

### Estimate Fees

```typescript
// Estimate for specific method
const feeEstimate = await contract.estimate('transfer', [recipient, amount]);
console.log(feeEstimate.overall_fee);
console.log(feeEstimate.resourceBounds);

// Or from account
const feeEstimate = await account.estimateInvokeFee({
  contractAddress: tokenAddress,
  entrypoint: 'transfer',
  calldata: [recipient, amount]
});
```

### Batch Transactions

```typescript
// Prepare multiple calls
const calls = [
  contract.populate('approve', [spender, amount]),
  contract.populate('transfer', [recipient, amount])
];

// Execute all at once
const response = await account.execute(calls);
const txHash = response.transaction_hash;
```

### Parse Events from Receipt

```typescript
// Wait for transaction
const receipt = await provider.waitForTransaction(txHash);

// Parse events using contract instance
const events = contract.parseEvents(receipt);

events.forEach(event => {
  console.log('Event:', event.name);
  console.log('Data:', event.data);
});
```

## Transaction Execution

### Simple Transaction

```typescript
const { transaction_hash } = await account.execute({
  contractAddress: tokenAddress,
  entrypoint: 'transfer',
  calldata: [recipient, amount]
});
```

### Multiple Calls (Multicall)

```typescript
const { transaction_hash } = await account.execute([
  {
    contractAddress: tokenA,
    entrypoint: 'approve',
    calldata: [dexAddress, amountA]
  },
  {
    contractAddress: dexAddress,
    entrypoint: 'swap',
    calldata: [tokenA, tokenB, amountA]
  }
]);
```

### With Fee Estimation

```typescript
// Estimate fee first
const feeEstimate = await account.estimateInvokeFee(calls);

// Use estimated resource bounds
const { transaction_hash } = await account.execute(calls, {
  resourceBounds: feeEstimate.resourceBounds
});
```

### V3 Transaction with Resource Bounds

```typescript
const { transaction_hash } = await account.execute(calls, {
  version: 3,
  resourceBounds: {
    l1_gas: { amount: '0x1000', price: '0x20' },
    l2_gas: { amount: '0x200', price: '0x5' },
    l1_data_gas: { amount: '0x500', price: '0x10' }
  },
  tip: 0,
  paymasterData: [],
  accountDeploymentData: [],
  nonceDataAvailabilityMode: 0,  // L1
  feeDataAvailabilityMode: 0     // L1
});
```

### Wait for Transaction

```typescript
// Wait with default options
const receipt = await provider.waitForTransaction(txHash);

// Or with timeout
const receipt = await provider.waitForTransaction(txHash, {
  maxRetries: 100,
  retryInterval: 1000
});

// Check status
if (receipt.status === 'ACCEPTED_ON_L2') {
  console.log('Transaction confirmed!');
}
```

## Contract Deployment

### Declare Contract

```typescript
const declareResponse = await account.declare({
  contract: compiledSierraAbi,
  casm: compiledCasmAbi  // required for Cairo 1
});

const classHash = declareResponse.class_hash;
```

### Deploy Contract (via UDC)

```typescript
const deployResponse = await account.deploy({
  classHash: classHash,
  constructorCalldata: [param1, param2],
  salt: '0x123...'  // optional
});

const contractAddress = deployResponse[0].address;
```

### Declare & Deploy in One Call

```typescript
const response = await account.declareAndDeploy({
  contract: compiledSierraAbi,
  casm: compiledCasmAbi,
  constructorCalldata: [param1, param2]
});

const contractAddress = response.deploy.contract_address;
```

### Deploy Account Contract

```typescript
const deployResponse = await account.deployAccount({
  classHash: accountClassHash,
  constructorCalldata: { publicKey },
  addressSalt: publicKey
});

const accountAddress = deployResponse.contract_address;
```

## Message Signing

### Sign EIP-712 Message

```typescript
const typedData = {
  domain: {
    name: 'MyDapp',
    chainId: constants.StarknetChainId.SN_SEPOLIA,
    version: '1'
  },
  types: {
    StarkNetDomain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'felt' },
      { name: 'version', type: 'string' }
    ],
    Message: [
      { name: 'content', type: 'string' }
    ]
  },
  primaryType: 'Message',
  message: { content: 'Hello Starknet!' }
};

const signature = await account.signMessage(typedData);
// Returns [r, s]

const hash = await account.hashMessage(typedData);
```

## Call Data Handling

### Compile Call Data from ABI

```typescript
const callData = new CallData(contractAbi);

// With object parameters
const compiled = callData.compile('transfer', {
  recipient: '0x123...',
  amount: 100n
});

// With array parameters
const compiled = callData.compile('transfer', ['0x123...', 100]);

// Get constructor parameters
const constructorCalldata = callData.compile('constructor', {
  name: 'MyToken',
  symbol: 'MTK'
});
```

### Validate Call Data

```typescript
const callData = new CallData(contractAbi);

// Throws if invalid
callData.validate('INVOKE', 'transfer', {
  recipient: '0x123...',
  amount: 100n
});
```

## Hash & Cryptography

### Calculate Contract Address

```typescript
const address = hash.calculateContractAddressFromHash(
  classHash,
  constructorCalldata,
  salt
);
```

### Get Function Selector

```typescript
const selector = hash.getSelectorFromName('transfer');
```

### Starknet Keccak Hash

```typescript
const keccakHash = hash.solidityUint256PackedKeccak256(['text'], ['hello']);
```

### Elliptic Curve Operations

```typescript
// Get public key from private key
const privKey = '0x123...';
const pubKey = ec.starkCurve.getStarkKey(privKey);

// Sign
const signature = ec.starkCurve.sign(messageHash, privKey);

// Verify
const valid = ec.starkCurve.verify(signature, messageHash, pubKey);
```

## Number & Encoding Utilities

### Number Conversions

```typescript
// To hex
const hex = num.toHex(123);      // '0x7b'
const hex = num.toHex(123n);     // '0x7b'

// To decimal string
const decimal = num.hexToDecimalString('0x7b');  // '123'

// To bigint
const bn = num.toBigInt('123');    // 123n
const bn = num.toBigInt('0x7b');   // 123n

// Array conversions
const hexArray = num.bigNumberishArrayToHexadecimalStringArray([1, 2, 3]);
const decArray = num.bigNumberishArrayToDecimalStringArray([1, 2, 3]);
```

### Short String Encoding

```typescript
// Encode string to felt (max 31 chars)
const felt = shortString.encodeShortString('hello');

// Decode felt to string
const str = shortString.decodeShortString('0x...');
```

### Cairo Data Types

```typescript
// U256 (for uint256 operations)
const u256 = cairo.uint256(1000n);
// Returns { low: '0x3e8', high: '0x0' }

// Byte Array
const byteArray = cairo.byteArrayFromString('hello');
```

## Provider Operations

### Get Chain ID

```typescript
const chainId = await provider.getChainId();
// 'SN_MAIN' or 'SN_SEPOLIA'
```

### Get Block

```typescript
const block = await provider.getBlock('latest');
const block = await provider.getBlock('pending');
const block = await provider.getBlock(blockNumber);
```

### Get Account Nonce (for any address)

```typescript
const nonce = await provider.getNonceForAddress(accountAddress);
```

### Call Contract (read-only)

```typescript
const result = await provider.callContract({
  contractAddress: tokenAddress,
  entrypoint: 'balanceOf',
  calldata: [userAddress]
});
```

### Get Transaction

```typescript
const tx = await provider.getTransaction(txHash);
```

### Get Transaction Receipt

```typescript
const receipt = await provider.getTransactionReceipt(txHash);
```

### Get Storage

```typescript
const storage = await provider.getStorageAt(
  contractAddress,
  storageVarAddress
);
```

### Get Class Hash

```typescript
const classHash = await provider.getClassHashAt(contractAddress);
```

### Get Contract Class

```typescript
const contractClass = await provider.getClassByHash(classHash);
```

## Common Patterns

### Create & Transfer Tokens

```typescript
// Create contract instance
const token = new Contract({
  abi: erc20Abi,
  address: tokenAddress,
  providerOrAccount: account
});

// Transfer
const tx = await token.transfer(recipient, parseFloat('100', 18));
const receipt = await provider.waitForTransaction(tx.transaction_hash);
```

### Batch Approve & Swap

```typescript
const token = new Contract({
  abi: erc20Abi,
  address: tokenAddress,
  providerOrAccount: account
});

const dex = new Contract({
  abi: dexAbi,
  address: dexAddress,
  providerOrAccount: account
});

const calls = [
  token.populate('approve', [dexAddress, amount]),
  dex.populate('swap', [tokenAddress, amount])
];

const tx = await account.execute(calls);
const receipt = await provider.waitForTransaction(tx.transaction_hash);
```

### Deploy New Contract

```typescript
// Declare
const declareRes = await account.declare({
  contract: compiledSierra,
  casm: compiledCasm
});
await provider.waitForTransaction(declareRes.transaction_hash);

// Deploy
const deployRes = await account.deploy({
  classHash: declareRes.class_hash,
  constructorCalldata: [param1, param2]
});

const newContractAddress = deployRes[0].address;
```

### Setup New Account

```typescript
// Generate key pair
const privKey = stark.randomAddress();
const pubKey = ec.starkCurve.getStarkKey(privKey);

// Calculate address
const salt = pubKey;
const accountAddress = hash.calculateContractAddressFromHash(
  accountClassHash,
  { publicKey: pubKey },
  salt
);

// Fund account (send ETH/STRK)
const fundTx = await mainAccount.execute({
  contractAddress: tokenAddress,
  entrypoint: 'transfer',
  calldata: [accountAddress, fund_amount]
});
await provider.waitForTransaction(fundTx.transaction_hash);

// Deploy account
const newAccount = new Account({
  address: accountAddress,
  signer: privKey,
  provider,
  cairoVersion: '1'
});

const deployTx = await newAccount.deployAccount({
  classHash: accountClassHash,
  constructorCalldata: { publicKey: pubKey },
  addressSalt: salt
});
await provider.waitForTransaction(deployTx.transaction_hash);
```

## Error Handling

```typescript
import { LibraryError, RpcError } from 'starknet';

try {
  await account.execute(calls);
} catch (error) {
  if (error instanceof LibraryError) {
    console.error('Library error:', error.message);
  } else if (error instanceof RpcError) {
    console.error('RPC error:', error.code, error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Type Checking & Validation

```typescript
import { isAccount } from 'starknet';

if (isAccount(obj)) {
  // obj has AccountInterface methods
}
```

## Constants

```typescript
import { constants } from 'starknet';

// Chain IDs
constants.StarknetChainId.SN_MAIN      // 'SN_MAIN'
constants.StarknetChainId.SN_SEPOLIA   // 'SN_SEPOLIA'

// Transaction versions
ETransactionVersion.V0, V1, V2, V3

// UDC
constants.UDC.ADDRESS
constants.UDC.ENTRYPOINT
constants.LegacyUDC.ADDRESS

// Cairo Felt
constants.TEXT_TO_FELT_MAX_LEN  // 31
constants.PRIME                  // 2^251 + 17*2^192 + 1

// Data Availability Modes
RPC.EDataAvailabilityMode.L1 // 0
RPC.EDataAvailabilityMode.L2 // 1
```

