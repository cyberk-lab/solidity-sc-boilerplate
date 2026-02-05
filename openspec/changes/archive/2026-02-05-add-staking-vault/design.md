# Design: Staking Vault

## Goals / Non-Goals

### Goals
- Create upgradeable staking vault for stabletoken deposits
- Issue transferable ERC20 share tokens (sSTBL)
- Share price increases with direct transfers to vault
- Implement delayed redemption with configurable cooldown
- Protection against inflation attacks and reentrancy

### Non-Goals
- Yield farming / external strategy integration (not ERC4626)
- Partial redemptions (all-or-nothing per request)
- Fee mechanism (can be added in V2)
- Multi-token support (stabletoken only)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        StakingVault                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Inheritance                                                  ││
│  │ ├── ERC20Upgradeable (sSTBL share token)                    ││
│  │ ├── ERC20PermitUpgradeable (gasless approvals)              ││
│  │ ├── ReentrancyGuardUpgradeable                              ││
│  │ ├── PausableUpgradeable                                     ││
│  │ ├── AccessControlDefaultAdminRulesUpgradeable               ││
│  │ └── UUPSUpgradeable                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Storage                                                         │
│  ├── stableToken: IERC20 (underlying asset)                     │
│  ├── redemptionDelay: uint256 (cooldown period)                 │
│  ├── redemptionRequests: mapping(address => RedemptionRequest)  │
│  ├── lockedShares: mapping(address => uint256)                  │
│  └── depositsPaused / redemptionsPaused: bool                   │
│                                                                  │
│  Core Functions                                                  │
│  ├── deposit(uint256 assets) → shares                           │
│  ├── requestRedeem(uint256 shares)                              │
│  ├── completeRedeem() → assets                                  │
│  ├── cancelRedeem()                                             │
│  └── View: sharePrice(), previewDeposit(), previewRedeem()      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ transfers
                              ▼
                    ┌─────────────────┐
                    │   StableToken   │
                    │     (STBL)      │
                    └─────────────────┘
```

## Key Formulas

### Share Price Calculation
```solidity
// Price with 18 decimals precision
function sharePrice() public view returns (uint256) {
    uint256 supply = totalSupply();
    if (supply == 0) return 1e18; // Initial 1:1 rate
    return (totalAssets() * 1e18) / supply;
}

// Total assets = all stabletoken held by vault
function totalAssets() public view returns (uint256) {
    return stableToken.balanceOf(address(this));
}
```

### Deposit Calculation
```solidity
function _convertToShares(uint256 assets) internal view returns (uint256) {
    uint256 supply = totalSupply();
    if (supply == 0) return assets; // 1:1 for first deposit
    return (assets * supply) / totalAssets();
}
```

### Redeem Calculation
```solidity
function _convertToAssets(uint256 shares) internal view returns (uint256) {
    uint256 supply = totalSupply();
    if (supply == 0) return 0;
    return (shares * totalAssets()) / supply;
}
```

## Decisions

### Decision 1: Custom vs ERC4626

**Choice**: Custom implementation

**Rationale**:
1. ERC4626 expects yield from external strategies; ours comes from direct inflows
2. Delayed redemption not in ERC4626 (would need EIP-7540 which is draft)
3. Using ERC4626 interface would mislead integrators expecting standard vault behavior
4. Simpler to implement custom than extend ERC4626 + EIP-7540

### Decision 2: Locked Shares Mechanism

**Choice**: Track locked shares separately, override `_update` to enforce

```solidity
mapping(address => uint256) public lockedShares;

function _update(address from, address to, uint256 amount) internal override {
    if (from != address(0)) { // Not minting
        uint256 unlocked = balanceOf(from) - lockedShares[from];
        require(amount <= unlocked, "InsufficientUnlockedBalance");
    }
    super._update(from, to, amount);
}
```

### Decision 3: Inflation Attack Protection

**Choice**: Virtual offset + minimum first deposit

```solidity
uint256 private constant VIRTUAL_SHARES = 1e3;
uint256 private constant VIRTUAL_ASSETS = 1;
uint256 public constant MIN_FIRST_DEPOSIT = 1e6; // 1 STBL (6 decimals example)

function _convertToShares(uint256 assets) internal view returns (uint256) {
    return (assets * (totalSupply() + VIRTUAL_SHARES)) / (totalAssets() + VIRTUAL_ASSETS);
}
```

### Decision 4: Redemption Request Structure

```solidity
struct RedemptionRequest {
    uint256 shares;       // Shares to redeem
    uint256 unlockTime;   // When redemption can be completed
}
mapping(address => RedemptionRequest) public redemptionRequests;
```

## Risk Map

| Component         | Risk Level | Reason                           | Verification                    |
| ----------------- | ---------- | -------------------------------- | ------------------------------- |
| Share calculation | MEDIUM     | Rounding errors, overflow        | Fuzz tests with extreme values  |
| Locked shares     | MEDIUM     | Custom ERC20 override            | Invariant: locked ≤ balance     |
| Inflation attack  | MEDIUM     | Well-known vault attack          | Virtual offset + min deposit    |
| Reentrancy        | LOW        | Standard pattern                 | ReentrancyGuard on all external |
| Upgrade           | LOW        | Existing pattern in codebase     | UUPS + AccessControl            |

## Storage Layout

```solidity
/// @custom:storage-location erc7201:stakingvault.storage
struct StakingVaultStorage {
    IERC20 stableToken;
    uint256 redemptionDelay;
    bool depositsPaused;
    bool redemptionsPaused;
    mapping(address => RedemptionRequest) redemptionRequests;
    mapping(address => uint256) lockedShares;
}
```

## Events

```solidity
event Deposited(address indexed user, uint256 assets, uint256 shares);
event RedeemRequested(address indexed user, uint256 shares, uint256 unlockTime);
event RedeemCompleted(address indexed user, uint256 shares, uint256 assets);
event RedeemCancelled(address indexed user, uint256 shares);
event RedemptionDelayUpdated(uint256 oldDelay, uint256 newDelay);
event DepositsPausedUpdated(bool paused);
event RedemptionsPausedUpdated(bool paused);
```

## Custom Errors

```solidity
error ZeroAmount();
error ZeroAddress();
error BelowMinimumDeposit();
error DepositsPaused();
error RedemptionsPaused();
error RedemptionNotReady();
error NoRedemptionRequest();
error PendingRedemptionExists();
error InsufficientUnlockedBalance();
error InsufficientBalance();
```

## Open Questions
- [ ] Exact MIN_FIRST_DEPOSIT value? (depends on stabletoken decimals)
- [ ] Default redemptionDelay? (suggest 7 days)
- [ ] Should cancelled redemption have a cooldown before re-requesting?
