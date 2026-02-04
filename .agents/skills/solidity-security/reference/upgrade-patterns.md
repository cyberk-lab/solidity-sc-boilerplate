# Upgrade Patterns Reference

## 1. UUPS Proxy Pattern

The proxy contract delegates all calls to an implementation contract via `delegatecall`. Unlike transparent proxies, the upgrade logic lives **in the implementation**, not the proxy. This means the implementation can be made non-upgradeable by removing `_authorizeUpgrade`.

Key mechanics:
- **Proxy** stores state and delegates execution to implementation address stored in ERC-1967 slot
- **Implementation** contains all logic including upgrade authorization
- `constructor` must call `_disableInitializers()` to prevent direct initialization of the implementation contract itself
- `initialize()` with `initializer` modifier replaces the constructor (runs once via proxy)
- `reinitializer(N)` runs migration logic during upgrades (version N > previous)
- `_authorizeUpgrade(address)` gates who can trigger upgrades

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlDefaultAdminRulesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyContractV1 is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    uint256 public value;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    function setValue(uint256 newValue) external {
        value = newValue;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
```

V2 upgrade with `reinitializer`:

```solidity
contract MyContractV2 is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    uint256 public value;        // existing — same slot
    uint256 public newField;     // appended — next slot

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initializeV2(uint256 _newField) public reinitializer(2) {
        newField = _newField;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
```

---

## 2. Storage Layout Rules

The EVM assigns state variables to sequential 256-bit storage slots starting from slot 0. Upgradeable contracts share storage between proxy and implementation, so layout must remain compatible across versions.

**Rules:**
- Variables are assigned slots in declaration order (inherited contracts first, in linearization order)
- **NEVER** reorder, remove, or change the type of existing variables
- **ONLY** append new variables after all existing ones
- Inheritance order matters: changing `is A, B` to `is B, A` shifts slots

| Change | Safe? | Why |
|--------|-------|-----|
| Append new variable at end | Yes | New slot, no collision |
| Reorder existing variables | **NO** | Shifts all slot assignments |
| Remove a variable | **NO** | Shifts subsequent slots |
| Change type (`uint128` → `uint256`) | **NO** | Changes slot size/layout |
| Rename variable (same type) | Yes | Name is not stored on-chain |
| Add new variable between existing | **NO** | Shifts subsequent slots |
| Change inheritance order | **NO** | Base contract slots shift |

Inspect layout with Foundry:

```bash
forge inspect MyContractV1 storage-layout --pretty
```

---

## 3. Storage Gaps

Reserve empty slots in base contracts so future versions can add variables without shifting derived contract layouts.

```solidity
contract BaseV1 is Initializable {
    uint256 public baseValue;
    uint256[50] private __gap; // reserves 50 slots
}

contract DerivedV1 is BaseV1 {
    uint256 public derivedValue; // starts at slot 51
}
```

When adding a variable to the base in V2, reduce the gap by 1:

```solidity
contract BaseV2 is Initializable {
    uint256 public baseValue;       // slot 0 (unchanged)
    uint256 public newBaseField;    // slot 1 (was gap[0])
    uint256[49] private __gap;      // 50 - 1 = 49
}
```

`DerivedV1.derivedValue` remains at slot 51 — no collision.

---

## 4. ERC-7201 Namespaced Storage

Modern alternative to sequential layout. Each contract isolates its state in a struct stored at a deterministic, collision-resistant slot.

**Slot formula:** `keccak256(abi.encode(uint256(keccak256(id)) - 1)) & ~bytes32(uint256(0xff))`

The `& ~0xff` alignment ensures the struct never wraps into another namespace's range.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MyContract {
    /// @custom:storage-location erc7201:myproject.storage.MyContract
    struct MyContractStorage {
        uint256 value;
        mapping(address => uint256) balances;
    }

    // keccak256(abi.encode(uint256(keccak256("myproject.storage.MyContract")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_LOCATION =
        0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567800;

    function _getStorage() private pure returns (MyContractStorage storage $) {
        bytes32 location = STORAGE_LOCATION;
        assembly {
            $.slot := location
        }
    }

    function getValue() public view returns (uint256) {
        return _getStorage().value;
    }

    function setBalance(address account, uint256 amount) internal {
        _getStorage().balances[account] = amount;
    }
}
```

Compute the slot off-chain:

```bash
cast keccak "myproject.storage.MyContract"
# Then apply: keccak256(abi.encode(uint256(hash) - 1)) & ~0xff
```

OpenZeppelin v5 contracts use ERC-7201 internally — inheriting them automatically uses namespaced storage.

---

## 5. Testing Upgrades

Verify state preservation, access control, and layout compatibility across versions.

```solidity
// Foundry test
function test_upgradePreservesState() public {
    // Deploy V1 behind proxy and initialize
    MyContractV1 implV1 = new MyContractV1();
    ERC1967Proxy proxy = new ERC1967Proxy(
        address(implV1),
        abi.encodeCall(MyContractV1.initialize, (admin))
    );
    MyContractV1 v1 = MyContractV1(address(proxy));

    // Use V1
    vm.prank(admin);
    v1.setValue(42);
    assertEq(v1.value(), 42);

    // Deploy V2 and upgrade
    MyContractV2 implV2 = new MyContractV2();
    vm.prank(admin);
    UUPSUpgradeable(address(proxy)).upgradeToAndCall(
        address(implV2),
        abi.encodeCall(MyContractV2.initializeV2, (100))
    );
    MyContractV2 v2 = MyContractV2(address(proxy));

    // V1 state preserved
    assertEq(v2.value(), 42);
    // V2 state initialized
    assertEq(v2.newField(), 100);
}

function test_reinitializerCannotRunTwice() public {
    // ... upgrade to V2 ...
    vm.prank(admin);
    vm.expectRevert(); // InvalidInitialization()
    v2.initializeV2(200);
}

function test_nonAdminCannotUpgrade() public {
    MyContractV2 implV2 = new MyContractV2();
    vm.prank(attacker);
    vm.expectRevert();
    UUPSUpgradeable(address(proxy)).upgradeToAndCall(address(implV2), "");
}
```

Compare storage layouts between versions:

```bash
forge inspect MyContractV1 storage-layout --pretty > layout-v1.txt
forge inspect MyContractV2 storage-layout --pretty > layout-v2.txt
diff layout-v1.txt layout-v2.txt
```

---

## 6. Deployment Checklist for Upgrades

- [ ] V2 inherits same base contracts in same order as V1
- [ ] No storage variable reordering or removal
- [ ] New variables appended after all existing ones
- [ ] `reinitializer` version incremented (V2 = `reinitializer(2)`, V3 = `reinitializer(3)`)
- [ ] `_authorizeUpgrade` still restricted to admin role
- [ ] Storage gaps reduced by count of new variables in base contracts
- [ ] Storage layout diff verified via `forge inspect`
- [ ] Tested on fork/testnet with production-like state
- [ ] Upgrade calldata tested (both `upgradeToAndCall` with reinitializer and plain `upgradeTo`)
