# Design: Add Reward Minting

## Goals / Non-Goals
- **Goals**: Rate-limited reward minting to StakingVault; admin-configurable cap; upgrade-safe
- **Non-Goals**: Reward scheduling/streaming; multiple recipients; off-chain oracle integration

## Architecture

```
Admin ──setRewardRecipient()──► StableToken ◄──mintReward()── Distributor Bot
         setDailyRewardCap()        │
                                    │ _mint(rewardRecipient, amount)
                                    ▼
                              StakingVault
                            (totalAssets ↑ → sharePrice ↑)
```

## Gap Analysis

| Component         | Have              | Need                          | Gap  |
| ----------------- | ----------------- | ----------------------------- | ---- |
| Role              | `MINTER_ROLE`     | `REWARD_DISTRIBUTOR_ROLE`     | New  |
| Rate limiter      | None              | Linear-decay (2 storage slots)| New  |
| Recipient storage | None              | `rewardRecipient` address     | New  |
| Cap config        | None              | `dailyRewardCapBps` + ceiling | New  |
| Storage gap       | None (StableToken)| `__gap` for upgrades          | New  |

## Decisions

### Linear-Decay Rate Limiter (not Fixed Epoch)
Fixed epoch is gameable: mint 1% at 23:59:59, mint 1% at 00:00:00 = 2% in 1 second. Rolling window requires storing every mint (unbounded gas). Linear decay uses 2 storage slots, O(1) gas, no boundary gaming:
```
elapsed = block.timestamp - lastMintTimestamp
decayed = mintedInPeriod * min(elapsed, 1 day) / 1 day
available = maxDaily - (mintedInPeriod - decayed)
```

### Vault-Only Recipient (not Arbitrary)
Even if distributor key is compromised, attacker can only inflate vault share price (capped/day), not mint to their own address. Principle of least privilege.

### Cap on StableToken (not Separate Contract)
Enforces rate limit at the token level — cannot be bypassed. Follows existing pattern where `mint()` is already on StableToken.

### Admin-Configurable Cap with Hard Ceiling
`dailyRewardCapBps` (default 100 = 1%) with `MAX_DAILY_REWARD_CAP_BPS = 500` (5%). Flexibility without unbounded risk.

### Storage Layout
New state variables appended AFTER existing storage (no `__gap` exists in current StableToken):
```
rewardRecipient         // slot N
dailyRewardCapBps       // slot N+1
mintedInCurrentPeriod   // slot N+2
lastMintTimestamp       // slot N+3
uint256[40] __gap       // slots N+4 to N+43
```

## Risk Map

| Component          | Risk Level | Reason                              | Verification                |
| ------------------ | ---------- | ----------------------------------- | --------------------------- |
| Linear-decay math  | LOW        | Simple arithmetic, well-known       | Unit tests + fuzz           |
| Storage layout     | MEDIUM     | No existing gap in StableToken      | OZ upgrades validation      |
| Front-running      | LOW        | Bounded by cap + redemptionDelay    | Operational (frequent mints)|
| Role separation    | LOW        | Existing OZ AccessControl pattern   | Unit tests                  |

## Deployment Plan
1. Deploy StableToken proxy with `initialize(admin, vaultAddress, 100)` — reward config included in initial deploy
2. Grant `REWARD_DISTRIBUTOR_ROLE` to distributor bot/multisig

## Open Questions
- [ ] Should reward minting emit an event on IStableToken interface?
- [ ] Consider packing `mintedInCurrentPeriod` + `lastMintTimestamp` into single slot for gas optimization?
