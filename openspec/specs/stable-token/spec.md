# stable-token Specification

## Purpose
TBD - created by archiving change add-stable-token. Update Purpose after archive.
## Requirements
### Requirement: StableToken ERC20 Contract

The system SHALL provide an upgradeable ERC20 token contract named `StableToken` (symbol: `STBL`, 18 decimals) using UUPS proxy pattern with ERC20Permit support.

#### Scenario: Correct initialization

- **WHEN** the contract is initialized with `initialize(admin, dailyRewardCapBps)`
- **THEN** name is "StableToken", symbol is "STBL", decimals is 18, totalSupply is 0, defaultAdminDelay is 1 day, admin has DEFAULT_ADMIN_ROLE, and `rewardRecipient` is `address(0)`

#### Scenario: Re-initialization prevented

- **WHEN** `initialize` is called a second time
- **THEN** it reverts with `InvalidInitialization`

### Requirement: Minting with MINTER_ROLE

The system SHALL restrict minting to accounts with `MINTER_ROLE`. Admin MUST NOT have MINTER_ROLE by default.

#### Scenario: Minter mints tokens

- **WHEN** an account with MINTER_ROLE calls `mint(to, amount)`
- **THEN** `to` balance increases by `amount`, totalSupply increases by `amount`, and a `Transfer` event is emitted from address(0)

#### Scenario: Non-minter mint rejected

- **WHEN** an account without MINTER_ROLE calls `mint`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

#### Scenario: Admin without MINTER_ROLE cannot mint

- **WHEN** the admin (who has only DEFAULT_ADMIN_ROLE) calls `mint`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

### Requirement: ERC20 Standard Operations

The system SHALL support standard ERC20 operations: transfer, approve, transferFrom.

#### Scenario: Transfer between accounts

- **WHEN** a token holder calls `transfer(to, amount)`
- **THEN** sender balance decreases and receiver balance increases by `amount`

### Requirement: ERC20Permit (EIP-2612)

The system SHALL support gasless approvals via ERC20Permit (`permit` function with EIP-712 typed signatures).

#### Scenario: Valid permit signature

- **WHEN** a valid EIP-712 signed permit is submitted
- **THEN** the spender allowance is set without the token holder spending gas

### Requirement: UUPS Upgrade Authorization

The system SHALL restrict contract upgrades to accounts with DEFAULT_ADMIN_ROLE.

#### Scenario: Non-admin upgrade rejected

- **WHEN** a non-admin calls `upgradeToAndCall`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

#### Scenario: Admin can upgrade

- **WHEN** an admin calls `upgradeToAndCall` with a valid implementation
- **THEN** the upgrade succeeds

### Requirement: Implementation Constructor Safety

The implementation contract SHALL call `_disableInitializers()` in its constructor to prevent direct initialization of the implementation.

#### Scenario: Implementation cannot be initialized directly

- **WHEN** `initialize` is called directly on the implementation contract (not via proxy)
- **THEN** it reverts with `InvalidInitialization`

### Requirement: Burning with MINTER_ROLE

The system SHALL restrict burning to accounts with `MINTER_ROLE`. The `burn(address from, uint256 amount)` function SHALL burn tokens from the specified account without requiring approval.

#### Scenario: Minter burns tokens

- **WHEN** an account with MINTER_ROLE calls `burn(from, amount)`
- **THEN** `from` balance decreases by `amount`, totalSupply decreases by `amount`, and a `Transfer` event is emitted to address(0)

#### Scenario: Non-minter burn rejected

- **WHEN** an account without MINTER_ROLE calls `burn`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

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

