# Change: Simplify Reward Daily Cap

## Why
The rolling-window linear-decay rate limiter is unnecessarily complex. A simple per-UTC-day cap reset is easier to reason about, audit, and explain to users. The max cap should also be tightened from 5% to 1%.

## What Changes
- **BREAKING**: `MAX_DAILY_REWARD_CAP_BPS` reduced from 500 (5%) to 100 (1%)
- Replace rolling linear-decay mechanism with simple UTC-day boundary reset
- `_currentMintedInPeriod()` now returns 0 if a new UTC day has started, or the raw `mintedInCurrentPeriod` if same day
- Repurpose `lastMintTimestamp` to store UTC day number (`block.timestamp / 86400`) instead of raw timestamp
- No `reinitializer` needed — contract not yet deployed

## Impact
- Affected specs: `stable-token`
- Affected code: `contracts/StableToken.sol`
- Minter.sol: **No changes needed** (Minter has no rate-limit logic)
- IStableToken.sol: No interface changes needed
- Tests: Hardhat + Foundry tests for reward minting need updating
