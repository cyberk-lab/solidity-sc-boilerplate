# reward-minting Specification

## Purpose
TBD - created by archiving change add-reward-minting. Update Purpose after archive.
## Requirements
### Requirement: REWARD_DISTRIBUTOR_ROLE

StableToken SHALL define a `REWARD_DISTRIBUTOR_ROLE` constant (`keccak256("REWARD_DISTRIBUTOR_ROLE")`) that is separate from `MINTER_ROLE` and grants permission to call `mintReward()`.

#### Scenario: Role separation

- **WHEN** an account has only `MINTER_ROLE`
- **THEN** calling `mintReward()` SHALL revert with `AccessControlUnauthorizedAccount`

### Requirement: Reward Recipient Configuration

StableToken SHALL store a `rewardRecipient` address (the StakingVault) that is the sole destination for reward mints. Admin SHALL be able to update it via `setRewardRecipient(address)`.

#### Scenario: Admin sets reward recipient

- **WHEN** admin calls `setRewardRecipient(vaultAddress)`
- **THEN** `rewardRecipient` is updated and `RewardRecipientUpdated(old, new)` is emitted

#### Scenario: Zero address rejected

- **WHEN** admin calls `setRewardRecipient(address(0))`
- **THEN** transaction SHALL revert with `InvalidRewardRecipient`

#### Scenario: Non-admin cannot set recipient

- **WHEN** non-admin calls `setRewardRecipient()`
- **THEN** transaction SHALL revert with `AccessControlUnauthorizedAccount`

### Requirement: Rate-Limited Reward Minting

StableToken SHALL provide `mintReward(uint256 amount)` restricted to `REWARD_DISTRIBUTOR_ROLE` that mints tokens to `rewardRecipient`. The function SHALL enforce a daily cap using linear-decay rate limiting: `maxMint = totalSupply * dailyRewardCapBps / 10_000`. Used capacity decays linearly over 24 hours.

#### Scenario: Successful reward mint within cap

- **WHEN** distributor calls `mintReward(amount)` where amount ≤ available capacity
- **THEN** tokens are minted to `rewardRecipient`, `RewardMinted(recipient, amount)` is emitted, vault `totalAssets()` increases

#### Scenario: Reward mint exceeds daily cap

- **WHEN** distributor calls `mintReward(amount)` where amount > available capacity
- **THEN** transaction SHALL revert with `ExceedsDailyRewardCap(requested, available)`

#### Scenario: Linear decay restores capacity

- **WHEN** full daily cap is used, then 12 hours pass
- **THEN** approximately 50% of capacity is restored
- **WHEN** full daily cap is used, then 24+ hours pass
- **THEN** 100% of capacity is restored

### Requirement: Daily Reward Cap Configuration

StableToken SHALL store `dailyRewardCapBps` (default 100 = 1%) configurable by admin via `setDailyRewardCap(uint256 capBps)`. A hard ceiling `MAX_DAILY_REWARD_CAP_BPS = 500` (5%) SHALL prevent excessive inflation.

#### Scenario: Admin updates cap

- **WHEN** admin calls `setDailyRewardCap(200)` (2%)
- **THEN** `dailyRewardCapBps` is updated and `DailyRewardCapUpdated(old, new)` is emitted

#### Scenario: Cap exceeds hard ceiling

- **WHEN** admin calls `setDailyRewardCap(600)`
- **THEN** transaction SHALL revert with `ExcessiveRewardCap(600, 500)`

### Requirement: Available Reward View

StableToken SHALL provide `availableRewardMint() → uint256` that returns the current mintable reward amount after applying linear decay.

#### Scenario: Query available after partial usage

- **WHEN** 50% of daily cap is used, no time passes
- **THEN** `availableRewardMint()` returns remaining 50% of daily cap

### Requirement: Zero Supply Edge Case

When `totalSupply() == 0`, `mintReward()` SHALL revert because `maxMint == 0`.

#### Scenario: No supply means no rewards

- **WHEN** `totalSupply()` is 0 and distributor calls `mintReward(1)`
- **THEN** transaction SHALL revert with `ExceedsDailyRewardCap`

### Requirement: Initialization

StableToken `initialize()` SHALL accept `admin` and `dailyRewardCapBps_` parameters. The `rewardRecipient` SHALL default to `address(0)` and MUST be configured post-deployment via `setRewardRecipient()` before `mintReward()` can be called.

#### Scenario: Initialize without rewardRecipient

- **WHEN** `initialize(admin, 100)` is called
- **THEN** `dailyRewardCapBps` is set to 100, `rewardRecipient` is `address(0)`, and admin has DEFAULT_ADMIN_ROLE

#### Scenario: mintReward blocked until rewardRecipient is set

- **WHEN** `rewardRecipient` is `address(0)` and distributor calls `mintReward(amount)`
- **THEN** transaction SHALL revert with `InvalidRewardRecipient`

