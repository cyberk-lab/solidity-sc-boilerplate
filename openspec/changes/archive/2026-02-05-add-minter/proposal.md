# Change: Add Minter Contract

## Why
Users need a mechanism to mint stableToken by depositing stable USD collateral, and redeem collateral by burning stableToken. The system requires admin-controlled collateral whitelisting and separate treasury/redeem vault management.

## What Changes
- **New** `Minter` upgradeable contract (UUPS + AccessControl) for deposit/mint and redeem flows
- **New** Collateral token whitelist management (admin adds/removes accepted stable USD tokens)
- **New** Treasury vault integration (deposited collateral forwarded to treasury)
- **New** Redeem vault (admin deposits liquidity, users withdraw on redeem)
- **New** Mock ERC20 tokens for testing (MockUSDC, MockUSDT)
- **New** Ignition deployment module for Minter
- **New** Hardhat test suite for Minter
- **Mod** StableToken gains `burn` function with MINTER_ROLE
- **Mod** StableToken gains Minter contract as MINTER_ROLE holder (deployment config only)

## Capabilities
- `specs/minter/spec.md` — New: Minter contract (deposit, redeem, admin config)
- `specs/stable-token/spec.md` — Mod: Add burn function with MINTER_ROLE

## Impact
- Affected specs: `stable-token` (add burn function)
- Affected code: `contracts/`, `test/`, `ignition/modules/`, `contracts/mock/`
