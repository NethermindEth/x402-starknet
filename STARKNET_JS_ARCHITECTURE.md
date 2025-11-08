# Starknet.js - Architecture & Class Relationships

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STARKNET.JS LIBRARY                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐         ┌──────────────────┐                  │
│  │   WALLET LAYER   │         │   APPLICATION    │                  │
│  │  (WalletAccount) │─────────│   (User Code)    │                  │
│  └────────┬─────────┘         └──────────────────┘                  │
│           │                                                          │
│  ┌────────▼────────────────────────────────────┐                    │
│  │         ACCOUNT LAYER                       │                    │
│  │  ┌──────────────────────────────────────┐   │                    │
│  │  │  Account (extends Provider)          │   │                    │
│  │  │  - execute()                         │   │                    │
│  │  │  - declare(), deploy()               │   │                    │
│  │  │  - estimateFee()                     │   │                    │
│  │  │  - signMessage()                     │   │                    │
│  │  └──────────────────────────────────────┘   │                    │
│  └────────┬────────────────────────────────────┘                    │
│           │                                                          │
│  ┌────────▼────────────────────────────────────┐                    │
│  │      PROVIDER LAYER (ProviderInterface)     │                    │
│  │  ┌──────────────────────────────────────┐   │                    │
│  │  │  Provider/RpcProvider                │   │                    │
│  │  │  - callContract()                    │   │                    │
│  │  │  - getBlock(), getTransaction()      │   │                    │
│  │  │  - invokeFunction()                  │   │                    │
│  │  │  - waitForTransaction()              │   │                    │
│  │  └──────────────────────────────────────┘   │                    │
│  └────────┬────────────────────────────────────┘                    │
│           │                                                          │
│  ┌────────▼──────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │   SIGNER LAYER    │  │  CONTRACT    │  │  PAYMASTER &   │       │
│  │                   │  │  (Contract)  │  │  DEPLOYER      │       │
│  │ - DefaultSigner   │  │              │  │                │       │
│  │ - EthSigner       │  │ - call()     │  │ - Deployer     │       │
│  │ - LedgerSigner    │  │ - invoke()   │  │ - PaymasterRpc │       │
│  └───────────────────┘  │ - estimate() │  └────────────────┘       │
│                          └──────────────┘                            │
│           │                    │                   │                │
│           ├────────────────────┼───────────────────┘                │
│           │                    │                                    │
│  ┌────────▼────────────────────▼──────────────┐                    │
│  │         UTILITY LAYER                      │                    │
│  │  ┌────────┬──────────┬────────┬────────┐   │                    │
│  │  │ Hash   │ CallData │ Encode │  Stark │   │                    │
│  │  │ Num    │ Events   │ JSON   │   EC   │   │                    │
│  │  └────────┴──────────┴────────┴────────┘   │                    │
│  └──────────────────────────────────────────────┘                    │
│           │                                                          │
│  ┌────────▼────────────────────────────────────┐                    │
│  │         CHANNEL LAYER                       │                    │
│  │  ┌──────────────────────────────────────┐   │                    │
│  │  │  RPC Channel (RPC 0.8 / 0.9)         │   │                    │
│  │  │  - Communicates with Starknet Node   │   │                    │
│  │  └──────────────────────────────────────┘   │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │                                          │
         ▼                                          ▼
    ┌─────────────┐                        ┌──────────────────┐
    │   Network   │                        │  Local Storage   │
    │ (Starknet)  │                        │  (Config, Cache) │
    └─────────────┘                        └──────────────────┘
```

## Core Interface Hierarchy

```
                    ┌──────────────────────┐
                    │ ProviderInterface    │
                    │                      │
                    │ + getChainId()       │
                    │ + callContract()     │
                    │ + getBlock()         │
                    │ + getTransaction()   │
                    │ + estimateFee()      │
                    │ + invokeFunction()   │
                    │ + declareContract()  │
                    │ + waitForTransaction()
                    └──────────┬───────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
        ┌──────────▼──────────┐  ┌────────▼─────────┐
        │ Provider (concrete) │  │ RpcProvider      │
        │                     │  │ (Actual RPC impl)│
        │ - Extends to support│  │                  │
        │   Account           │  │ + channel        │
        └──────────┬──────────┘  └────────┬─────────┘
                   │                      │
                   │                      │
            ┌──────▼──────────────────────▼─┐
            │  AccountInterface (extends     │
            │       ProviderInterface)       │
            │                                │
            │  + address                     │
            │  + signer: SignerInterface     │
            │  + cairoVersion                │
            │  + deployer?: DeployerInterface│
            │  + paymaster?: PaymasterInterface
            │                                │
            │  + execute()                   │
            │  + declare()                   │
            │  + deploy()                    │
            │  + signMessage()               │
            │  + getNonce()                  │
            └──────────┬──────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌─────▼────┐  ┌──────▼──────┐
    │ Account │  │  Wallet  │  │ Custom      │
    │ (base)  │  │ Account  │  │ Impls       │
    │         │  │(extends) │  │             │
    └─────────┘  └──────────┘  └─────────────┘
```

## Contract Wrapper Design

```
┌─────────────────────────────────────────┐
│        ContractInterface                │
│                                         │
│  + abi: Abi                            │
│  + address: string                     │
│  + providerOrAccount: ProviderOrAccount│
│  + classHash?: string                  │
│                                         │
│  // Dynamic method proxies:             │
│  + functions[methodName]()              │
│  + callStatic[methodName]()             │
│  + estimateFee[methodName]()            │
│  + populateTransaction[methodName]()    │
│                                         │
│  // Explicit methods:                   │
│  + call(method, args, options)          │
│  + invoke(method, args, options)        │
│  + estimate(method, args)               │
│  + populate(method, args)               │
│  + parseEvents(receipt)                 │
│  + attach(address, abi)                 │
│  + isDeployed()                         │
│  + getVersion()                         │
│  + isCairo1()                           │
│  + withOptions(options)                 │
│  + typedv2<TAbi>()                      │
└─────────┬───────────────────────────────┘
          │
          │ implements
          │
          ▼
┌─────────────────────────────────────────┐
│        Contract (concrete)              │
│                                         │
│ Dynamically creates methods based on    │
│ ABI during construction                 │
│                                         │
│ buildCall()                             │
│ buildInvoke()                           │
│ buildDefault()                          │
│ buildPopulate()                         │
│ buildEstimate()                         │
└─────────────────────────────────────────┘
```

## Signer Hierarchy

```
            ┌──────────────────────┐
            │ SignerInterface      │
            │                      │
            │ + getPubKey()        │
            │ + signMessage()      │
            │ + signTransaction()  │
            │ + signDeployAccount()│
            │ + signDeclare()      │
            └──────────┬───────────┘
                       │
      ┌────────────────┼────────────────┐
      │                │                │
   ┌──▼────────┐  ┌────▼─────┐  ┌──────▼──────────┐
   │  Signer   │  │EthSigner  │  │ LedgerSigner    │
   │(Default)  │  │           │  │ (multiple vers) │
   │           │  │           │  │                 │
   │ ECDSA over│  │Uses Eth   │  │Hardware wallet  │
   │ Stark     │  │signature  │  │integration      │
   │ curve     │  │scheme     │  │                 │
   └───────────┘  └───────────┘  └─────────────────┘
```

## Transaction Processing Flow

```
User Code
   │
   ├─ account.execute(calls)
   │
   ▼
Account.execute()
   │
   ├─ getNonce()
   ├─ transformCalls()
   ├─ buildInvocations()
   │
   ▼
Account.signTransaction()
   │
   ├─ signer.signTransaction()
   │  └─ hash transaction
   │  └─ sign hash
   │
   ▼
Account.invokeFunction()
   │
   ├─ provider.invokeFunction()
   │
   ▼
RpcProvider.invokeFunction()
   │
   ├─ Format transaction
   ├─ channel.invoke()
   │  └─ HTTP POST to Starknet RPC
   │
   ▼
Transaction Submitted
   │
   ├─ Return tx_hash
   │
   ▼
User calls provider.waitForTransaction(tx_hash)
   │
   ├─ Poll getTransactionReceipt()
   ├─ Check status (ACCEPTED_ON_L2, ACCEPTED_ON_L1, REVERTED)
   │
   ▼
Return Receipt
   │
   ├─ Parse events using contract.parseEvents()
   │
   ▼
Ready for next operation
```

## Call Data Compilation Flow

```
Contract Method Call
   │
   ├─ contract.invoke('transfer', [to, amount])
   │
   ▼
CallData Validation & Compilation
   │
   ├─ Extract ABI for method
   ├─ Validate arguments against ABI
   ├─ Transform arguments (e.g., addresses to felt)
   ├─ Compile to calldata array
   │
   ▼
Create Call Object
   {
     contractAddress: '0x...',
     entrypoint: 'transfer',
     calldata: [to_felt, amount_felt]
   }
   │
   ├─ Single call → Direct invocation
   ├─ Multiple calls → Multicall format
   │  ├─ Transform to callArray + flat calldata
   │  ├─ For Cairo 1: use felt252_array format
   │  └─ For Cairo 0: use flat calldata
   │
   ▼
Account.execute() processes
   │
   ├─ For Account contract:
   │  └─ Wraps calls in __execute__ entrypoint
   │  └─ Formats as per Cairo version
   │
   ▼
Sign and submit
```

## Module Interdependencies

```
Package Structure:

src/
├── account/
│   ├── interface.ts          ← Extends ProviderInterface
│   ├── default.ts            ← Implements with Signer, Deployer, Paymaster
│   └── types/
│
├── provider/
│   ├── interface.ts          ← Core abstraction
│   ├── rpc.ts                ← RPC implementation
│   ├── types/
│   └── modules/              ← Extensions (tip, gas prices, etc.)
│
├── contract/
│   ├── interface.ts
│   ├── default.ts            ← Uses CallData, Provider|Account
│   └── types/
│
├── signer/
│   ├── interface.ts
│   ├── default.ts
│   ├── ethSigner.ts
│   ├── ledgerSigner*.ts
│   └── types/
│
├── deployer/
│   ├── interface.ts
│   ├── default.ts            ← Uses CallData, hash utils
│   └── types/
│
├── paymaster/
│   ├── interface.ts
│   ├── rpc.ts                ← Uses CallData, utils
│   └── types/
│
├── utils/
│   ├── calldata/             ← ABI parsing, compilation
│   │   ├── index.ts (CallData class)
│   │   ├── cairo.ts
│   │   ├── parser/
│   │   ├── requestParser.ts
│   │   └── responseParser.ts
│   │
│   ├── hash/                 ← Cryptographic functions
│   │   ├── selector.ts
│   │   └── classHash/
│   │
│   ├── transaction/          ← Transaction utilities
│   │   └── transaction.ts (multicall transforms)
│   │
│   ├── num.ts                ← Number conversions
│   ├── encode.ts             ← Encoding/decoding
│   ├── stark.ts              ← Program compression, signatures
│   ├── ec.ts                 ← Elliptic curve (Starknet curve)
│   ├── events.ts             ← Event parsing
│   ├── merkle.ts             ← Merkle trees
│   ├── json.ts               ← JSON with BigInt support
│   ├── shortString.ts        ← Felt string conversion
│   ├── outsideExecution.ts   ← Outside execution protocol
│   └── ...
│
├── channel/
│   ├── rpc08.ts              ← RPC 0.8 channel
│   └── rpc09.ts              ← RPC 0.9 channel
│
├── wallet/
│   ├── account.ts            ← Extends Account for wallets
│   ├── connect.ts            ← Wallet event handlers
│   └── types/
│
├── types/
│   ├── index.ts              ← Main export
│   ├── lib/                  ← Base type definitions
│   ├── api/                  ← RPC type definitions
│   ├── errors.ts
│   ├── calldata.ts
│   ├── outsideExecution.ts
│   ├── signer.ts
│   └── typedData.ts
│
└── global/
    ├── constants.ts          ← Chain IDs, UDC, math constants
    ├── config.ts             ← Global configuration
    └── logger.ts             ← Logging system
```

## Data Flow: Contract Call

```
User initiates contract call
    │
    ▼
contract.transfer(recipient, amount)
    │
    ├─ Router resolves if view or state-changing
    │
    ├─ If view (read-only):
    │  ├─ contract.call('transfer', [recipient, amount])
    │  ├─ Compile args via CallData
    │  ├─ provider.callContract(call)
    │  ├─ Execute via starknet_call RPC
    │  └─ Return result
    │
    ├─ If state-changing (invoke):
    │  ├─ contract.invoke('transfer', [recipient, amount])
    │  ├─ Compile args via CallData
    │  ├─ Create Call object
    │  ├─ account.execute(call)
    │  ├─ Add nonce, sign transaction
    │  ├─ account.invokeFunction(signedTx)
    │  ├─ provider.invokeFunction(signedTx)
    │  ├─ RPC channel sends starknet_addInvokeTransaction
    │  ├─ Return tx_hash
    │  └─ Optionally wait for receipt
    │
    └─ Return formatted result
```

## Key Design Principles

1. **Interface-Based**: All major components are abstract interfaces with concrete implementations
2. **Composition**: Account composes Provider, Signer, Deployer, Paymaster
3. **Provider Pattern**: Both Provider and Account provide similar interfaces (duck typing)
4. **Separation of Concerns**: Each module has a single responsibility
5. **Type Safety**: Heavy use of TypeScript for compile-time safety
6. **Utility Functions**: Pure, tree-shakeable utility functions
7. **Extensibility**: Easy to extend with custom implementations
8. **Configuration**: Global config for defaults, overridable per-instance

## Transaction Version Support

```
Version Selection:
    │
    ├─ V0: Not recommended
    ├─ V1: Mainnet, uses wei for fees
    ├─ V2: Post-v1 improvements
    └─ V3: Latest standard
        ├─ Uses fri/strk for fees
        ├─ Resource bounds specification
        ├─ Data availability modes
        └─ Tip support

Resource Bounds (V3):
    {
      l1_gas: { amount: '0x...', price: '0x...' },
      l2_gas: { amount: '0x...', price: '0x...' },
      l1_data_gas: { amount: '0x...', price: '0x...' }
    }
```

## Testing & Mocking

Key interfaces to mock:
- `ProviderInterface` - Mock blockchain state
- `SignerInterface` - Mock signatures
- `DeployerInterface` - Mock deployments
- `PaymasterInterface` - Mock fee calculations

Example:
```typescript
class MockProvider implements ProviderInterface {
  async callContract(call: Call): Promise<CallContractResponse> {
    // Return test data
  }
  // ... implement other methods
}
```

