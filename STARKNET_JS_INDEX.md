# Starknet.js Library Documentation Index

This directory contains comprehensive documentation about the Starknet.js library, generated from exploration of the codebase at `/home/ametel/source/starknet.js` (v8.7.0).

## Documentation Files

### 1. **STARKNET_JS_EXPLORATION.md** (Comprehensive Reference)
Main documentation covering:
- **Main modules and their purposes** - Complete breakdown of all 11 core modules
- **Key APIs for contract interaction** - ContractInterface with full method signatures
- **Account management and signing** - AccountInterface, SignerInterface, and implementations
- **Transaction handling** - All transaction types, versions, and execution patterns
- **Patterns for building libraries** - 9 detailed patterns with code examples
- **Key design patterns** - Composition, Interface Segregation, Factory pattern, etc.
- **Important constants and addresses** - Chain IDs, UDC, math constants

**Best for:** Deep understanding of the library, architecture decisions, and building on top of it.

### 2. **STARKNET_JS_QUICK_REFERENCE.md** (Code Cookbook)
Practical code examples for:
- Installation and setup
- Account management
- Contract interaction (read/write)
- Transaction execution (simple and batch)
- Contract deployment
- Message signing
- Call data handling
- Hash and cryptography
- Number and encoding utilities
- Provider operations
- Common patterns (token transfers, swaps, account setup)
- Error handling
- Constants reference

**Best for:** Quick lookup while coding, copy-paste examples, common task implementations.

### 3. **STARKNET_JS_ARCHITECTURE.md** (System Design)
Visual documentation of:
- High-level architecture diagram
- Core interface hierarchy
- Contract wrapper design
- Signer hierarchy
- Transaction processing flow
- Call data compilation flow
- Module interdependencies
- Data flow for contract calls
- Key design principles
- Transaction version support
- Testing and mocking guidance

**Best for:** Understanding system design, creating custom implementations, visualizing relationships.

## Quick Navigation

### For Different Tasks

**Building a Custom Library:**
- Start: STARKNET_JS_EXPLORATION.md > Section 5 (Patterns)
- Then: STARKNET_JS_ARCHITECTURE.md (Module dependencies)
- Reference: STARKNET_JS_QUICK_REFERENCE.md

**Implementing Custom Signer:**
- Start: STARKNET_JS_EXPLORATION.md > Section 3
- Architecture: STARKNET_JS_ARCHITECTURE.md > Signer Hierarchy
- Code: STARKNET_JS_QUICK_REFERENCE.md > Message Signing

**Contract Interaction:**
- Start: STARKNET_JS_QUICK_REFERENCE.md > Contract Interaction
- Deep dive: STARKNET_JS_EXPLORATION.md > Section 2
- Architecture: STARKNET_JS_ARCHITECTURE.md > Contract Wrapper Design

**Transaction Handling:**
- Start: STARKNET_JS_QUICK_REFERENCE.md > Transaction Execution
- Deep dive: STARKNET_JS_EXPLORATION.md > Section 4
- Flow: STARKNET_JS_ARCHITECTURE.md > Transaction Processing Flow

**Deployment:**
- Start: STARKNET_JS_QUICK_REFERENCE.md > Contract Deployment
- Deep dive: STARKNET_JS_EXPLORATION.md > Section 3 & 4
- Patterns: STARKNET_JS_EXPLORATION.md > Section 5.4

## Key Insights

### Main Modules (11 total)
1. **account/** - Transaction execution and account management
2. **provider/** - Blockchain interaction (read operations)
3. **contract/** - Smart contract wrappers with ABI support
4. **signer/** - Transaction signing (3 implementations)
5. **deployer/** - Contract deployment via UDC
6. **wallet/** - Wallet integration layer
7. **paymaster/** - Sponsored transaction support
8. **channel/** - RPC communication (versions 0.8, 0.9)
9. **utils/** - 13+ utility modules for core operations
10. **types/** - TypeScript type definitions
11. **global/** - Constants, config, logging

### Critical Interfaces to Understand
- `ProviderInterface` - Core abstraction for blockchain interaction
- `AccountInterface` - Extends Provider, adds signing and execution
- `ContractInterface` - Wrapper for smart contract interaction
- `SignerInterface` - Transaction and message signing
- `DeployerInterface` - Custom deployment strategies
- `PaymasterInterface` - Fee payment handling

### Core Patterns
1. **Interface-Based Extensibility** - All major components are abstract
2. **Composition Over Inheritance** - Account composes Provider, Signer, Deployer
3. **Duck Typing** - Contract accepts Provider OR Account (ProviderOrAccount)
4. **Factory Pattern** - Provider.create() and Account constructors
5. **Utility Functions** - Tree-shakeable, pure functions for operations

### What to Reuse
- `CallData` class for ABI-driven transaction building
- Hash utilities for address computation and function selection
- Cryptography functions from EC module
- Number conversion utilities
- Event parsing functionality
- Transaction formatting helpers

### What to Extend
- Implement `SignerInterface` for custom signing
- Extend `Account` for domain-specific accounts (like WalletAccount)
- Implement `DeployerInterface` for custom deployment
- Wrap `Contract` for domain-specific contracts
- Extend `ProviderInterface` for custom providers (caching, logging)

## Version Information

- **starknet.js version:** 8.7.0
- **Supported transaction versions:** v0-v3 (v3 recommended)
- **Supported RPC versions:** 0.8, 0.9
- **Cairo versions:** 0, 1
- **Node requirement:** >=22

## Important Constants to Know

```typescript
// Chain IDs
SN_MAIN = 'SN_MAIN'
SN_SEPOLIA = 'SN_SEPOLIA'

// UDC (Universal Deployer Contract)
UDC_ADDRESS = '0x02ceed65a4bd731034c01113685c831b01c15d7d432f71afb1cf1634b53a2125'
UDC_ENTRYPOINT = 'deploy_contract'

// Cairo Felt constraints
TEXT_TO_FELT_MAX_LEN = 31  // Max string length as felt
PRIME = 2^251 + 17*2^192 + 1

// Transaction version
USE V3 FOR NEW CODE = 'Latest standard with resource bounds'
```

## Common Use Cases

### Case 1: Simple Token Transfer
- Use: `Contract` wrapper with ERC20 ABI
- Reference: STARKNET_JS_QUICK_REFERENCE.md > Create & Transfer Tokens

### Case 2: Multi-Step Transaction
- Use: `account.execute()` with array of calls
- Reference: STARKNET_JS_QUICK_REFERENCE.md > Batch Approve & Swap

### Case 3: Deploy New Contract
- Use: `account.declare()` then `account.deploy()`
- Reference: STARKNET_JS_QUICK_REFERENCE.md > Deploy New Contract

### Case 4: Setup New Account
- Use: Generate keys, calculate address, fund, deploy
- Reference: STARKNET_JS_QUICK_REFERENCE.md > Setup New Account

### Case 5: Create DApp Library
- Extend: `Account` or `Contract`
- Implement: Custom Signer or Deployer
- Use: Utility functions for core operations
- Reference: STARKNET_JS_EXPLORATION.md > Section 5

## File Organization in starknet.js

```
src/
├── account/           - Account abstraction (interface + default impl)
├── contract/          - Contract wrapper (interface + default impl)
├── provider/          - Provider abstraction (interface + RPC impl)
├── signer/            - Signer implementations (3 variants)
├── deployer/          - Deployment logic (UDC-based)
├── paymaster/         - Paymaster integration
├── wallet/            - Wallet provider support
├── channel/           - RPC communication layer
├── utils/             - Utility functions (13+ modules)
│   ├── calldata/      - ABI parsing and compilation
│   ├── hash/          - Cryptographic operations
│   ├── transaction/   - Transaction formatting
│   ├── encode/        - Encoding/decoding
│   ├── num/           - Number conversions
│   ├── stark/         - Program handling, signatures
│   ├── ec/            - Elliptic curve operations
│   ├── events/        - Event parsing
│   ├── merkle/        - Merkle proofs
│   ├── json/          - BigInt-safe JSON
│   ├── shortString/   - Felt string conversion
│   ├── outsideExecution/ - Outside execution protocol
│   └── ...
├── types/             - TypeScript definitions
├── global/            - Constants and configuration
└── channel/           - RPC transport
```

## Related Resources

- Main Library: `/home/ametel/source/starknet.js`
- Project: `/home/ametel/source/x402-starknet`
- Official Docs: https://www.starknetjs.com/docs/API/
- GitHub: https://github.com/starknet-io/starknet.js

## Document Generation Notes

These documents were generated through:
1. Systematic exploration of the starknet.js v8.7.0 codebase
2. Analysis of 11 core modules and 100+ source files
3. Examination of interface definitions and implementations
4. Review of test files for practical usage patterns
5. Documentation of design patterns and best practices

Last updated: November 9, 2025
