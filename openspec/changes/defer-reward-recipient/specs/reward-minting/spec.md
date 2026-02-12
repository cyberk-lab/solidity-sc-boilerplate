## MODIFIED Requirements

### Requirement: Initialization

StableToken `initialize()` SHALL accept `admin` and `dailyRewardCapBps_` parameters. The `rewardRecipient` SHALL default to `address(0)` and MUST be configured post-deployment via `setRewardRecipient()` before `mintReward()` can be called.

#### Scenario: Initialize without rewardRecipient

- **WHEN** `initialize(admin, 100)` is called
- **THEN** `dailyRewardCapBps` is set to 100, `rewardRecipient` is `address(0)`, and admin has DEFAULT_ADMIN_ROLE

#### Scenario: mintReward blocked until rewardRecipient is set

- **WHEN** `rewardRecipient` is `address(0)` and distributor calls `mintReward(amount)`
- **THEN** transaction SHALL revert with `InvalidRewardRecipient`
