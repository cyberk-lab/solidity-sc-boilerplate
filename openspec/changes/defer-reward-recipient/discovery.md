# Discovery: Defer rewardRecipient from initialize

## 1. Feature Summary

Remove `rewardRecipient_` parameter from `StableToken.initialize()` because StakingVault (the reward recipient) is deployed after StableToken, creating a chicken-and-egg problem. Admin will set it post-deployment via the existing `setRewardRecipient()`.

## 2. Architecture Snapshot

### Relevant Files
| File | Purpose |
| ---- | ------- |
| `contracts/StableToken.sol` | Main contract — `initialize()` currently requires `rewardRecipient_` |
| `contracts/interfaces/IStableToken.sol` | Interface — no `initialize` signature, no change needed |
| `ignition/modules/StableToken.ts` | Ignition module — passes `rewardRecipient` to `initialize` |
| `ignition/modules/StakingVault.ts` | Deploys StakingVault after StableToken via `useModule` |
| `ignition/modules/StableCoinSystem.ts` | Composes both modules |
| `tasks/deploy.ts` | Deploy task — forwards `rewardRecipient` from config |
| `tasks/CONFIG.ts` | Config — has `rewardRecipient` placeholder (`'0x...'`) |
| `test/fixture.ts` | Test fixtures — passes `rewardRecipient` to StableTokenModule |
| `test/StableTokenReward.ts` | Reward tests — asserts `rewardRecipient` is set at init |
| `test/foundry/StableToken.fuzz.t.sol` | Fuzz tests — passes `vault` as rewardRecipient to `initialize` |

### Deployment Order
StableToken (impl → proxy → initialize) → StakingVault (impl → proxy → initialize(stableToken)) → admin calls `setRewardRecipient(vault)`

## 3. Existing Patterns

### Key Observation
`setRewardRecipient(address)` already exists and is admin-only. The guard in `mintReward()` already checks `rewardRecipient == address(0)` and reverts with `InvalidRewardRecipient`. So the contract is already safe if `rewardRecipient` starts as `address(0)`.

## 4. Technical Constraints
- **Storage layout**: Removing a parameter from `initialize()` does NOT affect storage layout — `rewardRecipient` slot stays in the same position.
- **Upgrade safety**: This is a breaking change to the initializer signature. Since the contract has not been deployed to mainnet yet, this is safe.

## 5. Gap Analysis
| Component | Have | Need | Gap |
| --------- | ---- | ---- | --- |
| `StableToken.initialize()` | Accepts 3 params `(admin, rewardRecipient_, dailyRewardCapBps_)` | Accepts 2 params `(admin, dailyRewardCapBps_)` | Modify |
| `StableToken.initialize()` | Validates `rewardRecipient_ != address(0)` | No validation needed — starts as `address(0)` | Remove |
| Ignition module | Passes `rewardRecipient` parameter | Does not pass `rewardRecipient` | Modify |
| Deploy task | Forwards `rewardRecipient` from config | Does not forward `rewardRecipient` | Modify |
| Config | Has `rewardRecipient` field | No `rewardRecipient` field | Modify |
| Test fixtures | Passes `rewardRecipient` in deploy params | Does not pass `rewardRecipient`; calls `setRewardRecipient` after deploy | Modify |
| Foundry fuzz tests | Passes `vault` to `initialize` | Only passes `admin` and `capBps` | Modify |
| Reward tests | Asserts `rewardRecipient` is set at init | Asserts `rewardRecipient` is `address(0)` at init, then set via setter | Modify |
| Specs | `initialize()` SHALL accept `rewardRecipient_` | `initialize()` SHALL NOT accept `rewardRecipient_` | Modify |

## 6. Open Questions
- None — the approach is straightforward.
