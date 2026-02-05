# Change: Add Reward Minting to StableToken

## Why
Stakers in StakingVault need yield. A dedicated reward minting mechanism on StableToken allows controlled inflation-based rewards, capped daily to prevent abuse, minted directly to the vault to increase share price.

## What Changes
- Add `REWARD_DISTRIBUTOR_ROLE` to StableToken for reward minting (separate from collateral-backed `MINTER_ROLE`)
- Add `mintReward(uint256 amount)` function with linear-decay daily rate limit (default 1% of totalSupply/day, admin-configurable up to 5%)
- Add `rewardRecipient` state variable (vault-only minting — principle of least privilege)
- Add `dailyRewardCapBps` admin-configurable cap with hard ceiling
- Add `availableRewardMint()` view function for off-chain integrations
- Add `initializeV2()` reinitializer for upgrade path
- Add storage gap to StableToken for future upgrades

## Impact
- Affected specs: `specs/stable-token/spec.md` (new capability)
- Affected code: `contracts/StableToken.sol`, `contracts/interfaces/IStableToken.sol`
- Test files: new test suite for reward minting
