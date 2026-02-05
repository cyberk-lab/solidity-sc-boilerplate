# Minter Specification

## ADDED Requirements

### Requirement: Minter Initialization

The system SHALL provide an upgradeable Minter contract (UUPS + AccessControlDefaultAdminRules) initialized with a stableToken address, admin address, and treasury vault address.

#### Scenario: Correct initialization

- **WHEN** the contract is initialized with token, admin, and treasuryVault addresses
- **THEN** stableToken is set, treasuryVault is set, admin has DEFAULT_ADMIN_ROLE, and defaultAdminDelay is 1 day

#### Scenario: Zero-address validation

- **WHEN** any of token, admin, or treasuryVault is address(0)
- **THEN** it reverts with `ZeroAddress`

#### Scenario: Re-initialization prevented

- **WHEN** `initialize` is called a second time
- **THEN** it reverts with `InvalidInitialization`

### Requirement: Collateral Token Whitelist

The system SHALL allow admin to manage a whitelist of accepted collateral tokens (stable USD). Only whitelisted tokens SHALL be accepted for deposit. The stableToken itself SHALL NOT be allowed as collateral.

#### Scenario: Admin adds collateral token

- **WHEN** admin calls `addCollateralToken(token)`
- **THEN** token is added to the whitelist, decimals are cached, and `CollateralTokenAdded` event is emitted

#### Scenario: Admin removes collateral token

- **WHEN** admin calls `removeCollateralToken(token)`
- **THEN** token is removed from the whitelist, cached decimals are cleared, and `CollateralTokenRemoved` event is emitted
- **AND** existing redeem vault balance for that token remains accessible for admin withdrawal

#### Scenario: Non-admin cannot modify whitelist

- **WHEN** a non-admin calls `addCollateralToken` or `removeCollateralToken`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

#### Scenario: StableToken cannot be added as collateral

- **WHEN** admin calls `addCollateralToken` with the stableToken address
- **THEN** it reverts with `InvalidCollateralToken`

### Requirement: Deposit and Mint

The system SHALL allow users to deposit whitelisted collateral tokens and receive stableToken at a 1:1 USD ratio (adjusted for decimals).

#### Scenario: User deposits collateral and receives stableToken

- **WHEN** a user calls `deposit(collateralToken, amount)` with a whitelisted token and sufficient allowance
- **THEN** `amount` of collateral is transferred from user to treasuryVault, stableToken is minted to user (decimal-adjusted), and `Deposited` event is emitted

#### Scenario: Deposit with non-whitelisted token rejected

- **WHEN** a user calls `deposit` with a token not in the whitelist
- **THEN** it reverts with `TokenNotWhitelisted`

#### Scenario: Deposit with zero amount rejected

- **WHEN** a user calls `deposit` with amount = 0
- **THEN** it reverts with `ZeroAmount`

### Requirement: Redeem Collateral

The system SHALL allow users to burn stableToken and receive a chosen collateral token from the redeem vault.

#### Scenario: User redeems stableToken for collateral

- **WHEN** a user calls `redeem(collateralToken, tokenAmount)` with a whitelisted token and sufficient stableToken balance
- **THEN** `tokenAmount` of stableToken is burned from user, decimal-adjusted collateral is transferred from Minter (redeem vault) to user, and `Redeemed` event is emitted

#### Scenario: Redeem with insufficient redeem vault balance

- **WHEN** a user calls `redeem` but the Minter contract has insufficient collateral balance
- **THEN** it reverts with `InsufficientRedeemVaultBalance`

#### Scenario: Redeem with non-whitelisted token rejected

- **WHEN** a user calls `redeem` with a token not in the whitelist
- **THEN** it reverts with `TokenNotWhitelisted`

#### Scenario: Redeem with dust amount rejected

- **WHEN** a user calls `redeem` with a tokenAmount that cannot be evenly converted to collateral (e.g., 1 wei for 6-decimal collateral)
- **THEN** it reverts with `InvalidRedeemAmount`

### Requirement: Treasury Vault Configuration

The system SHALL allow admin to update the treasury vault address.

#### Scenario: Admin updates treasury vault

- **WHEN** admin calls `setTreasuryVault(newVault)`
- **THEN** treasuryVault is updated and `TreasuryVaultUpdated` event is emitted

#### Scenario: Non-admin cannot update treasury vault

- **WHEN** a non-admin calls `setTreasuryVault`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

### Requirement: Admin Deposit to Redeem Vault

The system SHALL allow admin to deposit collateral tokens into the Minter contract to fund the redeem vault for user withdrawals.

#### Scenario: Admin deposits to redeem vault

- **WHEN** admin calls `depositToRedeemVault(collateralToken, amount)` with sufficient allowance
- **THEN** `amount` of collateral is transferred from admin to Minter contract and `RedeemVaultDeposited` event is emitted

#### Scenario: Non-admin cannot deposit to redeem vault

- **WHEN** a non-admin calls `depositToRedeemVault`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

### Requirement: Admin Withdraw from Redeem Vault

The system SHALL allow admin to withdraw collateral tokens from the Minter contract (redeem vault). This function SHALL work for any token (including delisted tokens for recovery).

#### Scenario: Admin withdraws from redeem vault

- **WHEN** admin calls `withdrawFromRedeemVault(token, amount, to)` with sufficient balance
- **THEN** `amount` of token is transferred to `to` and `RedeemVaultWithdrawn` event is emitted

### Requirement: UUPS Upgrade Authorization

The system SHALL restrict contract upgrades to accounts with DEFAULT_ADMIN_ROLE.

#### Scenario: Non-admin upgrade rejected

- **WHEN** a non-admin calls `upgradeToAndCall`
- **THEN** it reverts with `AccessControlUnauthorizedAccount`

### Requirement: Reentrancy Protection

The system SHALL protect deposit, redeem, and admin vault functions with reentrancy guards (`nonReentrant`).

#### Scenario: Reentrancy on deposit blocked

- **WHEN** a malicious collateral token attempts reentrancy during `deposit`
- **THEN** the transaction reverts with `ReentrancyGuardReentrantCall`

### Requirement: View Functions

The system SHALL provide view functions for collateral whitelist and redeem vault state.

#### Scenario: Query collateral tokens and redeem vault

- **WHEN** `getCollateralTokens()` is called after adding USDC and USDT
- **THEN** it returns both addresses
- **AND** `isCollateralToken(USDC)` returns true, `isCollateralToken(randomToken)` returns false
- **AND** `getRedeemVaultBalance(USDC)` returns the Minter's USDC balance
