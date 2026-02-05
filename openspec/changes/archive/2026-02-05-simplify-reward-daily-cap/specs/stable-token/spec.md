## ADDED Requirements

### Requirement: Daily Reward Cap Ceiling

The system SHALL enforce a hard ceiling `MAX_DAILY_REWARD_CAP_BPS` of 100 basis points (1%) for the configurable daily reward cap.

#### Scenario: Cap exceeds ceiling rejected

- **WHEN** admin calls `setDailyRewardCap(101)` (or higher, up to former 500)
- **THEN** it reverts with `ExcessiveRewardCap(101, 100)`

#### Scenario: Initialize with cap exceeding ceiling rejected

- **WHEN** `initialize` is called with `dailyRewardCapBps_ = 101`
- **THEN** it reverts with `ExcessiveRewardCap(101, 100)`

### Requirement: UTC-Day Reward Minting

The system SHALL allow REWARD_DISTRIBUTOR_ROLE to mint reward tokens up to `totalSupply * dailyRewardCapBps / 10_000` per UTC day. The cap SHALL reset at the start of each new UTC day (00:00 UTC). Multiple mints within the same UTC day SHALL accumulate against the daily cap.

#### Scenario: First mint of the day succeeds

- **WHEN** REWARD_DISTRIBUTOR calls `mintReward(amount)` where `amount <= totalSupply * dailyRewardCapBps / 10_000` and it is a new UTC day
- **THEN** tokens are minted to `rewardRecipient`, `mintedInCurrentPeriod` is set to `amount`, and `RewardMinted` event is emitted

#### Scenario: Multiple mints within same UTC day accumulate

- **WHEN** REWARD_DISTRIBUTOR mints 50 tokens, then attempts to mint 60 more, and the daily cap is 100
- **THEN** the second mint succeeds (total 110 <= cap), or reverts if cumulative exceeds cap

#### Scenario: Cap resets on new UTC day

- **WHEN** a new UTC day starts (block.timestamp crosses a 86400-second boundary)
- **THEN** `mintedInCurrentPeriod` effectively resets to 0, allowing full cap to be minted again

### Requirement: Available Reward Mint View

The system SHALL provide `availableRewardMint()` that returns the remaining mintable reward for the current UTC day, accounting for already-minted amounts.

#### Scenario: Query available after partial mint

- **WHEN** 30 tokens have been minted today and the daily cap allows 100
- **THEN** `availableRewardMint()` returns 70
