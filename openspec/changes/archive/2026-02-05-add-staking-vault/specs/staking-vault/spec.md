# Staking Vault Specification

## ADDED Requirements

### Requirement: Deposit Stabletoken for Shares

The StakingVault SHALL allow users to deposit stabletoken and receive share tokens (sSTBL) proportional to the current exchange rate.

#### Scenario: First deposit (empty vault)
- **GIVEN** vault has 0 total assets and 0 total shares
- **WHEN** user deposits 1000 stabletoken
- **THEN** user receives 1000 sSTBL shares (1:1 initial rate)
- **AND** totalAssets() returns 1000
- **AND** totalSupply() returns 1000

#### Scenario: Subsequent deposit at current rate
- **GIVEN** vault has 2000 total assets and 1000 total shares (rate = 2.0)
- **WHEN** user deposits 500 stabletoken
- **THEN** user receives 250 sSTBL shares (500 / 2.0)
- **AND** Deposit event is emitted with (depositor, assets=500, shares=250)

#### Scenario: Zero deposit rejected
- **WHEN** user attempts to deposit 0 stabletoken
- **THEN** transaction reverts with `ZeroAmount` error

---

### Requirement: Share Price Appreciation via Direct Transfers

The StakingVault SHALL increase share price when stabletoken is transferred directly to the vault address (not via deposit).

#### Scenario: Direct transfer increases share price
- **GIVEN** vault has 1000 assets and 1000 shares (price = 1.0)
- **WHEN** anyone transfers 1000 stabletoken directly to vault address
- **THEN** sharePrice() returns 2.0 (2000 assets / 1000 shares)
- **AND** existing shareholders' value doubles without new shares minted

---

### Requirement: Delayed Redemption Request

The StakingVault SHALL require users to request redemption and wait a configurable delay before claiming assets.

#### Scenario: Create redemption request
- **GIVEN** user owns 100 sSTBL shares
- **WHEN** user calls requestRedeem(100)
- **THEN** user's 100 shares are locked (cannot transfer)
- **AND** RedeemRequested event is emitted with (user, shares=100, unlockTime)
- **AND** user cannot call requestRedeem again until current request is completed/cancelled

#### Scenario: Complete redemption after delay
- **GIVEN** user has pending redemption request for 100 shares
- **AND** redemptionDelay (e.g., 7 days) has elapsed
- **AND** current share price is 2.0
- **WHEN** user calls completeRedeem()
- **THEN** user receives 200 stabletoken (100 shares × 2.0 price)
- **AND** 100 sSTBL shares are burned
- **AND** RedeemCompleted event is emitted

#### Scenario: Redemption before delay rejected
- **GIVEN** user has pending request but delay has not elapsed
- **WHEN** user calls completeRedeem()
- **THEN** transaction reverts with `RedemptionNotReady` error

#### Scenario: Cancel redemption request
- **GIVEN** user has pending redemption request
- **WHEN** user calls cancelRedeem()
- **THEN** shares are unlocked and returned to transferable balance
- **AND** RedeemCancelled event is emitted

---

### Requirement: Share Token (sSTBL) is Transferable ERC20

The share token SHALL be a standard ERC20 token that can be transferred between addresses.

#### Scenario: Transfer shares
- **GIVEN** user A owns 100 sSTBL and has no pending redemption
- **WHEN** user A transfers 50 sSTBL to user B
- **THEN** user A has 50 sSTBL, user B has 50 sSTBL
- **AND** Transfer event is emitted

#### Scenario: Cannot transfer locked shares
- **GIVEN** user has 100 sSTBL but 60 are locked in redemption request
- **WHEN** user attempts to transfer 50 sSTBL
- **THEN** transaction reverts with `InsufficientUnlockedBalance` error

---

### Requirement: View Functions

The StakingVault SHALL provide view functions for calculating conversions and checking state.

#### Scenario: sharePrice returns current rate
- **GIVEN** vault has 5000 assets and 2500 shares
- **WHEN** sharePrice() is called
- **THEN** returns 2e18 (2.0 with 18 decimals precision)

#### Scenario: previewDeposit calculates shares
- **GIVEN** current share price is 2.0
- **WHEN** previewDeposit(1000) is called
- **THEN** returns 500 (shares user would receive)

#### Scenario: previewRedeem calculates assets
- **GIVEN** current share price is 2.0
- **WHEN** previewRedeem(500) is called
- **THEN** returns 1000 (assets user would receive)

---

### Requirement: Inflation Attack Protection

The StakingVault SHALL protect against first-depositor inflation attacks.

#### Scenario: Minimum deposit on first deposit
- **GIVEN** vault is empty
- **WHEN** user deposits less than MIN_DEPOSIT (e.g., 1000 wei)
- **THEN** transaction reverts with `BelowMinimumDeposit` error

#### Scenario: Virtual offset protects share calculation
- **GIVEN** vault uses virtual shares offset
- **WHEN** attacker deposits 1 wei and donates large amount
- **THEN** subsequent depositors still receive fair shares (not rounded to 0)

---

### Requirement: Admin Controls

The StakingVault SHALL provide admin functions for configuration and emergencies.

#### Scenario: Set redemption delay
- **GIVEN** caller has ADMIN_ROLE
- **WHEN** setRedemptionDelay(3 days) is called
- **THEN** redemptionDelay is updated to 3 days
- **AND** RedemptionDelayUpdated event is emitted

#### Scenario: Pause deposits
- **GIVEN** caller has ADMIN_ROLE
- **WHEN** pauseDeposits() is called
- **THEN** all deposit attempts revert with `DepositsPaused` error

#### Scenario: Pause redemptions
- **GIVEN** caller has ADMIN_ROLE
- **WHEN** pauseRedemptions() is called
- **THEN** all requestRedeem/completeRedeem attempts revert with `RedemptionsPaused` error

---

### Requirement: Security

The StakingVault SHALL implement security best practices.

#### Scenario: Reentrancy protection
- **WHEN** malicious contract attempts reentrancy during deposit/redeem
- **THEN** transaction reverts due to ReentrancyGuard

#### Scenario: UUPS upgrade restricted
- **GIVEN** caller does NOT have DEFAULT_ADMIN_ROLE
- **WHEN** caller attempts to upgrade contract
- **THEN** transaction reverts with AccessControl error
