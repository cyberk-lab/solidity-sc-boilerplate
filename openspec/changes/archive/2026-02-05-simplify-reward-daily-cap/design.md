# Design: Simplify Reward Daily Cap

## Goals / Non-Goals
- **Goals**: Replace rolling-window linear-decay with UTC-day boundary reset; lower max cap to 1%
- **Non-Goals**: Sub-day rate limiting, changing Minter.sol, renaming storage variables

## Architecture

The change is localized to `StableToken.sol`'s internal reward logic. No cross-contract changes needed.

## Gap Analysis

| Component                  | Have                         | Need                            | Gap    |
| -------------------------- | ---------------------------- | ------------------------------- | ------ |
| `MAX_DAILY_REWARD_CAP_BPS` | 500 (5%)                    | 100 (1%)                        | Modify |
| `_currentMintedInPeriod()` | Linear decay over 1 day     | UTC-day boundary check          | Modify |
| `lastMintTimestamp`         | Stores Unix timestamp        | Stores UTC day number           | Modify |
| `mintReward` state update   | Sets raw `block.timestamp`  | Sets `block.timestamp / 86400`  | Modify |


## Decisions

### Keep `lastMintTimestamp` variable name (don't rename)
Renaming would change the auto-generated getter ABI, breaking off-chain integrations. Instead, update NatSpec to clarify it now stores UTC day number.

### Day-boundary straddling is acceptable
At 1% cap, worst case: 2% minted across midnight boundary in a short window. Same class of boundary issue exists in the current rolling window. Acceptable trade-off for simplicity.

## Risk Map

| Component                    | Risk Level | Reason                                  | Verification               |
| ---------------------------- | ---------- | --------------------------------------- | --------------------------- |
| Storage layout               | LOW        | Same slots, same types, no reorder      | Compile + upgrade test      |
| `_currentMintedInPeriod()`  | LOW        | Simpler logic, pattern well-known       | Unit tests                  |
| ABI getter semantics change  | LOW        | `lastMintTimestamp` value changes meaning | Update NatSpec            |

## Migration Plan
Not applicable — contract not yet deployed. First deployment uses `initialize()` directly.

## Open Questions
- None — approach confirmed by oracle review
