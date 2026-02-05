# Discovery: Staking Vault

## 1. Feature Summary
A staking contract where users deposit stabletoken and receive share tokens. Share price increases when anyone transfers stabletoken directly to the pool. Redemptions are delayed with a configurable cooldown period.

## 2. Architecture Snapshot

### Relevant Packages
| Package       | Purpose                        | Key Files                |
| ------------- | ------------------------------ | ------------------------ |
| `contracts/`  | Solidity smart contracts       | StableToken.sol          |
| `test/`       | Hardhat tests (TypeScript)     | *.test.ts                |
| `test/foundry/` | Forge tests (fuzz/invariant) | *.t.sol                  |

### Entry Points
- Contract: `StakingVault.sol` (new)
- Interface: `IStakingVault.sol` (new)

## 3. Existing Patterns

### Similar Implementations
| Feature             | Location              | Pattern Used                    |
| ------------------- | --------------------- | ------------------------------- |
| StableToken         | contracts/StableToken.sol | UUPS + AccessControl + ERC20 |
| HmmtController      | External (Helix)      | Custom share/asset accounting   |
| ERC4626             | OpenZeppelin          | Tokenized vault standard        |

### Reusable Utilities
- OpenZeppelin Upgradeable contracts (UUPS pattern)
- AccessControlDefaultAdminRulesUpgradeable
- ReentrancyGuardUpgradeable
- SafeERC20

## 4. Technical Constraints
- **Solidity**: ^0.8.28
- **Upgrade Pattern**: UUPS (consistent with existing contracts)
- **Dependencies**: OpenZeppelin Contracts Upgradeable v5.x
- **Token**: Must work with existing StableToken.sol

## 5. External References

### ERC4626 vs Custom Implementation Analysis

| Aspect            | ERC4626                          | Custom (HmmtController-style)    |
| ----------------- | -------------------------------- | -------------------------------- |
| Share price model | `totalAssets / totalSupply`      | Same formula                     |
| Yield source      | External strategies (lending)    | Direct pool inflows (donations)  |
| Delayed redeem    | Not built-in (needs EIP-7540)    | Built-in support                 |
| Composability     | High (standard interface)        | Lower (proprietary)              |
| Complexity        | Lower (use OZ implementation)    | Higher (custom accounting)       |

### Key Insight from HmmtController Pattern
- Share price = `totalStableTokens / totalShares`
- Direct transfers to pool **inflate share price** for existing holders
- Delayed redemption prevents flash loan attacks and gaming

### EIP-7540 (Async ERC4626)
- Extension for delayed deposits/withdrawals
- Still draft status, limited adoption
- More complexity than simple custom implementation

## 6. Gap Analysis

| Component          | Have                    | Need                              | Gap Size |
| ------------------ | ----------------------- | --------------------------------- | -------- |
| Share Token        | StableToken (reference) | StakingVault shares (ERC20)       | New      |
| Deposit Logic      | None                    | assets → shares conversion        | New      |
| Withdraw Logic     | None                    | Delayed redemption queue          | New      |
| Price Calculation  | None                    | totalAssets / totalSupply         | New      |
| Security           | None                    | Reentrancy, inflation protection  | New      |

## 7. Recommendation

**Build Custom Implementation** for these reasons:

1. **Simpler than EIP-7540**: EIP-7540 adds complexity for async operations that we can implement more simply
2. **Better fit for use case**: Our price appreciation comes from capital inflows, not yield strategies
3. **Delayed redemption built-in**: Core requirement not in standard ERC4626
4. **Avoid misleading integrators**: Standard ERC4626 vaults imply yield-bearing; ours is inflow-driven
5. **Reuse ERC20 for shares**: Share tokens should be transferable ERC20 tokens

### Suggested Architecture
```
StakingVault (UUPS Upgradeable)
├── ERC20Upgradeable (share tokens)
├── ReentrancyGuardUpgradeable
├── AccessControlDefaultAdminRulesUpgradeable
└── Custom Logic
    ├── deposit(uint256 assets) → shares
    ├── requestRedeem(uint256 shares)
    ├── completeRedeem()
    ├── sharePrice() → price with 18 decimals
    └── totalAssets() → total stabletoken in pool
```

## 8. Open Questions
- [x] ERC4626 vs Custom? → **Custom** (delayed redeem + price model mismatch)
- [ ] Redemption delay duration? (suggest: configurable, default 7 days)
- [ ] Minimum deposit amount? (inflation attack protection)
- [ ] Admin can pause deposits/withdrawals? (emergency)
- [ ] Fee on deposit/withdraw? (treasury)
