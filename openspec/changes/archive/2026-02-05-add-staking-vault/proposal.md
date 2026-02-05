# Change: Add Staking Vault Contract

## Why
Users need to stake stabletoken and earn rewards when new capital flows into the pool. Share price increases automatically when anyone transfers stabletoken directly to the vault, creating value for existing stakers.

## What Changes

### New Capabilities
- **StakingVault contract**: Upgradeable vault that accepts stabletoken deposits and issues share tokens
- **Share token (sSTBL)**: ERC20 token representing proportional ownership of pooled assets
- **Delayed redemption**: Request-based withdrawal with configurable cooldown period
- **Price appreciation**: Share price increases when stabletoken is transferred/donated to vault

### Key Features
- Deposit stabletoken → receive sSTBL shares at current exchange rate
- Exchange rate: `totalAssets() / totalSupply()` (price increases with direct inflows)
- Delayed redeem: `requestRedeem()` → wait `redemptionDelay` → `completeRedeem()`
- Emergency pause capability for admin

## Impact

### Affected Specs
- New: `specs/staking-vault/spec.md`

### Affected Code
- New: `contracts/StakingVault.sol`
- New: `contracts/interfaces/IStakingVault.sol`
- New: `test/StakingVault.test.ts`
- New: `test/foundry/StakingVault.t.sol`
- New: `ignition/modules/StakingVault.ts`

### Dependencies
- `@openzeppelin/contracts-upgradeable` (already in project)
- Works with existing `StableToken.sol`
