# Discovery: Simplify Reward Daily Cap

## 1. Feature Summary
Replace the rolling-window linear-decay rate limiter in StableToken's reward minting with a simple per-UTC-day cap reset, and lower MAX_DAILY_REWARD_CAP_BPS from 5% to 1%.

## 2. Architecture Snapshot

### Relevant Packages
| Package      | Purpose                        | Key Files                                      |
| ------------ | ------------------------------ | ---------------------------------------------- |
| `contracts/` | Reward minting logic           | `StableToken.sol`, `interfaces/IStableToken.sol` |

### Entry Points
- `StableToken.mintReward(uint256 amount)` — called by REWARD_DISTRIBUTOR_ROLE
- `StableToken.availableRewardMint()` — view function for remaining cap

## 3. Existing Patterns

### Current Rate-Limit Mechanism (to be replaced)
| Component                  | Location                  | Pattern Used                                    |
| -------------------------- | ------------------------- | ----------------------------------------------- |
| `_currentMintedInPeriod()` | `StableToken.sol:171-176` | Rolling window with linear decay over 1 day     |
| `mintedInCurrentPeriod`    | `StableToken.sol:36`      | State: cumulative minted in current window      |
| `lastMintTimestamp`        | `StableToken.sol:39`      | State: timestamp of last mint                   |
| `MAX_DAILY_REWARD_CAP_BPS` | `StableToken.sol:27`     | Constant: 500 (5%)                              |

### Reusable Utilities
- `SafeERC20`, `AccessControlDefaultAdminRulesUpgradeable` — no change needed
- `dailyRewardCapBps` admin setter — can be reused as-is (just with new ceiling)

## 4. Technical Constraints
- **Storage layout**: Must be append-only. `mintedInCurrentPeriod` (slot) and `lastMintTimestamp` (slot) already exist. Can repurpose `lastMintTimestamp` to store the UTC day number instead of raw timestamp. `mintedInCurrentPeriod` semantics change from "decayed rolling" to "total minted today".
- **Upgrade safety**: StableToken uses UUPS. New logic must use `reinitializer(N)` if re-initialization is needed (likely not — only logic change, no new state).
- No new dependencies.

## 5. External References
- OpenZeppelin UUPS upgrade pattern docs
- EVM `block.timestamp` gives Unix epoch seconds; UTC day = `block.timestamp / 86400`

## 6. Gap Analysis (Synthesized)
| Component                    | Have                              | Need                          | Gap Size |
| ---------------------------- | --------------------------------- | ----------------------------- | -------- |
| Daily cap mechanism          | Rolling linear-decay window       | Simple UTC-day boundary reset | Modify   |
| `MAX_DAILY_REWARD_CAP_BPS`  | 500 (5%)                          | 100 (1%)                      | Modify   |
| `_currentMintedInPeriod()`  | Linear decay calculation          | UTC-day check, return 0 or raw| Modify   |
| `lastMintTimestamp`          | Raw timestamp                     | Repurpose as last UTC day     | Modify   |
| `IStableToken` interface     | Current events/errors             | No change needed              | None     |

## 7. Tracks Used
- **Architecture Snapshot**: Read affected files (StableToken.sol, IStableToken.sol, Minter.sol)
- **Internal Patterns**: Analyzed existing rate-limit mechanism
- Skipped External Patterns (well-known UTC day pattern) and Constraint Check (no new deps)
