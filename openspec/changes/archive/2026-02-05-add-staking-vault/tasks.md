# Tasks: Add Staking Vault

## 1. Contract Interface & Structure

- [x] 1.1 Create `contracts/interfaces/IStakingVault.sol` with all function signatures, events, and errors
- [x] 1.2 Create `contracts/StakingVault.sol` skeleton with inheritance chain and storage layout

## 2. Core Logic Implementation

- [x] 2.1 Implement `initialize()` with all upgradeable initializers
- [x] 2.2 Implement `totalAssets()` - returns stabletoken balance
- [x] 2.3 Implement `sharePrice()` - returns price with 18 decimals
- [x] 2.4 Implement `_convertToShares()` with virtual offset protection
- [x] 2.5 Implement `_convertToAssets()` with virtual offset protection
- [x] 2.6 Implement `previewDeposit()` and `previewRedeem()` view functions

## 3. Deposit Flow

- [x] 3.1 Implement `deposit(uint256 assets)` with all checks
- [x] 3.2 Add reentrancy guard to deposit

## 4. Redemption Flow

- [x] 4.1 Implement `requestRedeem(uint256 shares)` with all checks
- [x] 4.2 Implement `completeRedeem()` with all checks
- [x] 4.3 Implement `cancelRedeem()` with all checks
- [x] 4.4 Override `_update()` to enforce locked shares constraint

## 5. Admin Functions

- [x] 5.1 Implement `setRedemptionDelay(uint256 newDelay)` - admin only
- [x] 5.2 Implement `setDepositsPaused()` / `setRedemptionsPaused()` - admin only
- [x] 5.3 Implement `_authorizeUpgrade()` - admin only

## 6. Hardhat Tests (TypeScript)

- [x] 6.1 Create test fixture with MockERC20 + StakingVault deployment
- [x] 6.2 Test: First deposit (1:1 rate)
- [x] 6.3 Test: Subsequent deposit at current rate
- [x] 6.4 Test: Share price increases with direct transfer
- [x] 6.5 Test: Request redeem locks shares
- [x] 6.6 Test: Complete redeem after delay
- [x] 6.7 Test: Complete redeem before delay reverts
- [x] 6.8 Test: Cancel redeem unlocks shares
- [x] 6.9 Test: Cannot transfer locked shares
- [x] 6.10 Test: Admin functions access control
- [x] 6.11 Test: Pause/unpause functionality

## 7. Foundry Tests (Fuzz)

- [x] 7.1 Create `test/foundry/StakingVault.fuzz.t.sol` with setup
- [x] 7.2 Fuzz test: deposit with random amounts
- [x] 7.3 Fuzz test: deposit after donation gives fewer shares
- [x] 7.4 Fuzz test: share price never zero after deposit
- [x] 7.5 Fuzz test: redeem returns correct assets
- [x] 7.6 Fuzz test: convert round trip (rounding favors vault)
- [x] 7.7 Fuzz test: cannot transfer locked shares

## 8. Deployment

- [x] 8.1 Create `ignition/modules/StakingVault.ts` deployment module

## 9. Documentation

- [x] 9.1 Add NatDoc comments to all public functions
- [x] 9.2 Update README with StakingVault usage examples
