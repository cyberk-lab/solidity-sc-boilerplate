# Gas Optimization Reference

## 1. Storage Optimization

### Variable Packing

EVM operates on 32-byte (256-bit) words. Each storage slot is 32 bytes. Multiple variables smaller than 32 bytes can share a single slot if declared adjacently.

| Type | Size | Notes |
|------|------|-------|
| `uint256` / `int256` | 32B | Full slot |
| `address` | 20B | |
| `uint128` / `int128` | 16B | |
| `uint96` / `int96` | 12B | Commonly paired with `address` |
| `uint64` / `int64` | 8B | |
| `uint32` / `int32` | 4B | |
| `uint16` / `int16` | 2B | |
| `uint8` / `int8` / `bool` | 1B | |

**Packing strategy:** declare small variables adjacent so they fit in one slot.

```solidity
// GOOD — 1 slot (20 + 12 = 32 bytes)
address owner;    // 20 bytes
uint96 balance;   // 12 bytes

// BAD — 2 slots (padding wastes space)
address owner;    // 20 bytes → slot 0 (12 bytes wasted)
uint256 balance;  // 32 bytes → slot 1

// BAD — standalone uint8 wastes a full slot + masking overhead
uint8 status;     // 1 byte → slot 0 (31 bytes wasted)
```

Struct packing follows the same rules:

```solidity
// GOOD — 2 slots
struct UserInfo {
    address user;     // 20B ┐ slot 0
    uint96 amount;    // 12B ┘
    uint256 deadline; // 32B → slot 1
}

// BAD — 3 slots
struct UserInfo {
    address user;     // 20B → slot 0 (12B wasted)
    uint256 deadline; // 32B → slot 1
    uint96 amount;    // 12B → slot 2 (20B wasted)
}
```

### Gas Costs

| Operation | Gas Cost |
|-----------|----------|
| SSTORE (zero → non-zero) | 20,000 + 2,100 (cold) |
| SSTORE (non-zero → non-zero) | 2,900 + 2,100 (cold) |
| SSTORE (non-zero → zero) | 2,900 + 2,100 (cold) − 4,800 refund |
| SLOAD (cold) | 2,100 |
| SLOAD (warm) | 100 |
| MLOAD / MSTORE | 3 |
| TSTORE / TLOAD (EIP-1153) | 100 |

### Transient Storage (EIP-1153)

Requires Solidity ≥ 0.8.24 with EVM version `cancun`. Data persists only for the duration of a transaction and is automatically cleared.

**Use cases:** reentrancy guards, intra-transaction data passing, flash loan callbacks.

```solidity
// Transient storage via inline assembly
bytes32 private constant _GUARD_SLOT = keccak256("reentrancy.guard");

function _setGuard(uint256 value) private {
    assembly {
        tstore(_GUARD_SLOT, value)
    }
}

function _getGuard() private view returns (uint256 value) {
    assembly {
        value := tload(_GUARD_SLOT)
    }
}
```

OpenZeppelin's `ReentrancyGuardTransient` saves **>2,000 gas per guarded call** vs classic `ReentrancyGuard` (TSTORE/TLOAD at 100 gas vs SSTORE/SLOAD at 2,900+/2,100).

---

## 2. Computation Optimization

### Caching

Cache storage reads into local variables when accessed ≥ 2 times:

```solidity
// BAD — 2 SLOAD (4,200 gas cold)
if (balances[user] > 0) {
    _transfer(user, balances[user]);
}

// GOOD — 1 SLOAD (2,100 gas cold)
uint256 bal = balances[user];
if (bal > 0) {
    _transfer(user, bal);
}
```

### calldata vs memory

| Modifier | Behavior | Cost |
|----------|----------|------|
| `calldata` | Read-only pointer to tx input | Cheap — no copy |
| `memory` | Copies data into memory | Expensive — allocation + copy |

Use `calldata` for read-only external function parameters (arrays, structs, bytes, strings):

```solidity
// BAD
function process(uint256[] memory ids) external { ... }

// GOOD
function process(uint256[] calldata ids) external { ... }
```

### Constants and Immutables

| Keyword | Set When | Storage Cost | Read Cost |
|---------|----------|--------------|-----------|
| `constant` | Compile time | 0 (inlined in bytecode) | ~bytecode read |
| `immutable` | Constructor | 0 (stored in code section) | ~bytecode read |

```solidity
uint256 public constant MAX_SUPPLY = 10_000;
address public immutable factory;

constructor(address _factory) {
    factory = _factory;
}
```

### Loop Optimization

```solidity
// BAD — reads array.length every iteration, i++ has overflow check
for (uint256 i = 0; i < array.length; i++) {
    // logic
}

// GOOD — cached length, unchecked pre-increment
uint256 len = array.length;
for (uint256 i; i < len; ) {
    // logic
    unchecked { ++i; }
}
```

### Custom Errors

```solidity
// BAD — stores string in bytecode, ~20 gas per byte of string
require(balance >= amount, "Insufficient balance");

// GOOD — 4-byte selector only
error InsufficientBalance(uint256 available, uint256 required);
if (balance < amount) revert InsufficientBalance(balance, amount);
```

---

## 3. Advanced: Yul (Inline Assembly)

**When to use:**

- Keccak256 of small data already in memory
- Direct storage slot access (ERC-7201 namespaced storage)
- Efficient bit manipulation and packing/unpacking
- Avoiding ABI encoding overhead for known layouts

**When NOT to use:**

- General business logic (security risk, unreadable)
- When Solidity can do the same within ~500 gas difference
- Complex control flow or anything that requires auditability

**Example — efficient keccak256:**

```solidity
function efficientHash(address a, uint256 b) internal pure returns (bytes32 result) {
    assembly {
        mstore(0x00, a)
        mstore(0x20, b)
        result := keccak256(0x00, 0x40)
    }
}
```

---

## 4. ERC-7201 Namespaced Storage

Prevents storage collisions in upgradeable contracts (UUPS, transparent proxy).

**Formula:** `keccak256(keccak256(namespace_id) - 1) & ~0xff`

The `& ~0xff` zeroes the last byte, reserving 256 consecutive slots starting from the computed location.

OpenZeppelin v5 uses this pattern for all upgradeable contracts.

```solidity
/// @custom:storage-location erc7201:counter.storage.main
struct MainStorage {
    uint256 x;
    uint256 y;
}

// keccak256(abi.encode(uint256(keccak256("counter.storage.main")) - 1)) & ~bytes32(uint256(0xff))
bytes32 private constant MAIN_STORAGE_LOCATION =
    keccak256(abi.encode(uint256(keccak256("counter.storage.main")) - 1)) & ~bytes32(uint256(0xff));

function _getMainStorage() private pure returns (MainStorage storage $) {
    assembly {
        $.slot := MAIN_STORAGE_LOCATION
    }
}
```

Usage:

```solidity
function increment() external {
    MainStorage storage s = _getMainStorage();
    s.x += 1;
}
```

---

## 5. Quick Reference Checklist

- [ ] Storage variables packed into minimum slots
- [ ] No standalone `uint8`/`bool` (pack with neighbors or use `uint256`)
- [ ] Storage reads cached in local variables
- [ ] External params use `calldata` where possible
- [ ] `constant` and `immutable` used for fixed values
- [ ] Loops use cached length and `unchecked { ++i; }`
- [ ] Custom errors instead of `require` strings
- [ ] EIP-1153 transient storage for reentrancy guards
- [ ] ERC-7201 for upgradeable contract storage
- [ ] Gas report reviewed: `pnpm gas:forge`
