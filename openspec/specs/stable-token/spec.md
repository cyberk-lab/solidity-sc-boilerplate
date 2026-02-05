# stable-token Specification

## Purpose
TBD - created by archiving change add-stable-token. Update Purpose after archive.
## Requirements
### Requirement: StableToken ERC20 Contract

The system SHALL provide an upgradeable ERC20 token contract named `StableToken` (symbol: `STBL`, 18 decimals) using UUPS proxy pattern with ERC20Permit support.

#### Scenario: Correct initialization

- **WHEN** the contract is initialized with an admin address
- **THEN** name is "StableToken", symbol is "STBL", decimals is 18, totalSupply is 0, defaultAdminDelay is 1 day, and admin has DEFAULT_ADMIN_ROLE

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

