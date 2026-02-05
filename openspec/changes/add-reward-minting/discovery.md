# Discovery: Add Reward Minting

## 1. Feature Summary
Add a rate-limited reward minting mechanism to StableToken that allows a dedicated role to mint reward tokens directly to the StakingVault, increasing share price for stakers. Capped at a configurable daily percentage of total supply with linear-decay rate limiting.

## 2. Architecture Snapshot

### Relevant Contracts
| Contract          | Purpose                              | Key Files                                      |
| ----------------- | ------------------------------------ | ---------------------------------------------- |
| `StableToken`     | ERC20 stablecoin with role-based mint | `contracts/StableToken.sol`                    |
| `StakingVault`    | Share-based vault for staking        | `contracts/StakingVault.sol`                   |
| `Minter`          | Collateral-backed mint/burn          | `contracts/Minter.sol`                         |
| `IStableToken`    | Interface for mint/burn              | `contracts/interfaces/IStableToken.sol`        |

### Entry Points
- `StableToken.mint()` — existing MINTER_ROLE mint (collateral-backed via Minter)
- `StableToken.mintReward()` — NEW: REWARD_DISTRIBUTOR_ROLE mint (reward distribution to vault)

## 3. Existing Patterns

### Similar Implementations
| Feature          | Location              | Pattern Used                     |
| ---------------- | --------------------- | -------------------------------- |
| Role-based mint  | `StableToken.sol:37`  | `onlyRole(MINTER_ROLE)` modifier |
| Admin config     | `StakingVault.sol:167`| `onlyRole(DEFAULT_ADMIN_ROLE)`   |
| Storage gap      | `StakingVault.sol:43` | `uint256[40] private __gap`      |

### Reusable Utilities
- AccessControlDefaultAdminRulesUpgradeable for role management
- Existing event/error pattern from IStakingVault

## 4. Technical Constraints
- UUPS upgradeable — new state vars must be appended, storage gap needed
- Needs `reinitializer(2)` for upgrade path to set initial values
- StableToken currently has NO storage gap — must add one
- `totalSupply()` is inherited from ERC20Upgradeable

## 5. External References
- OpenZeppelin UUPS Upgradeable: storage layout rules
- Linear token-bucket rate limiter pattern (common in DeFi reward distributors)

## 6. Gap Analysis
| Component         | Have                        | Need                              | Gap Size |
| ----------------- | --------------------------- | --------------------------------- | -------- |
| Role              | `MINTER_ROLE`               | `REWARD_DISTRIBUTOR_ROLE`         | New      |
| Mint function     | `mint(to, amount)`          | `mintReward(amount)` rate-limited | New      |
| Rate limiter      | None                        | Linear-decay daily cap            | New      |
| Recipient storage | None                        | `rewardRecipient` state var       | New      |
| Cap config        | None                        | `dailyRewardCapBps` state var     | New      |
| Storage gap       | None in StableToken         | `__gap` for upgrade safety        | New      |
| Upgrade init      | `initialize(admin)`         | `initializeV2(recipient, cap)`    | New      |
| View function     | None                        | `availableRewardMint()`           | New      |

## 7. Tracks Used
- **Architecture Snapshot**: Read all affected contracts and interfaces
- **Internal Patterns**: Analyzed existing role-based mint and admin config patterns
- **Skipped External Patterns**: Linear-decay rate limiter is well-known DeFi pattern, no novel research needed
- **Skipped Constraint Check**: No new dependencies required
