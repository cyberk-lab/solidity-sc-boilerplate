# Discovery: StableCoin Deploy Module

## 1. Feature Summary

Create a composite Ignition module that deploys both StableToken and StakingVault in a single deployment flow, and update the deploy task to use this new module.

## 2. Architecture Snapshot

### Relevant Files
| File | Purpose |
| --- | --- |
| `ignition/modules/StableToken.ts` | Deploys StableToken proxy + impl |
| `ignition/modules/StakingVault.ts` | Deploys StakingVault proxy + impl |
| `ignition/modules/Minter.ts` | Example of composing modules via `m.useModule()` |
| `tasks/deploy.ts` | Hardhat deploy task (currently deploys CounterModule) |
| `tasks/CONFIG.ts` | Network config (already has `admin`, `rewardRecipient`, `dailyRewardCapBps`) |

### Entry Points
- CLI: `npx hardhat deploy --network <name>`

## 3. Existing Patterns

### Similar Implementations
| Feature | Location | Pattern Used |
| --- | --- | --- |
| Minter module | `ignition/modules/Minter.ts` | `m.useModule(StableTokenModule)` to compose child modules and forward results |
| Counter deploy | `tasks/deploy.ts` | `runDeployTask(args, connection)` calling `ignition.deploy(Module, { parameters })` |

### Reusable Utilities
- `buildModule` / `m.useModule` for module composition
- `m.encodeFunctionCall` for proxy initialize encoding
- `getConfig()` in `tasks/CONFIG.ts` already returns `admin`, `rewardRecipient`, `dailyRewardCapBps`

## 4. Technical Constraints
- StakingVault.initialize requires the StableToken proxy address → deployment order matters
- Ignition handles ordering via `m.useModule` dependency graph
- CONFIG already has fields for StableToken; needs `redemptionDelay` for StakingVault

## 5. Tracks Used
- **Architecture Snapshot**: Read all ignition modules, contracts, and tasks
- **Internal Patterns**: Analyzed Minter module for composition pattern
- *Skipped External Patterns*: No novel patterns; standard Ignition composition
- *Skipped Constraint Check*: No new dependencies
- *Skipped Documentation*: Ignition `m.useModule` is well-established

## 6. Gap Analysis
| Component | Have | Need | Gap Size |
| --- | --- | --- | --- |
| StableToken module | `ignition/modules/StableToken.ts` | Already exists | None |
| StakingVault module | `ignition/modules/StakingVault.ts` | Needs `stableToken` param from composed module | Small (modify) |
| Composite module | None | `StableCoinWrapper.ts` composing both | New |
| Deploy task | Deploys CounterModule | Deploy StableCoinWrapper module | Modify |
| Config | Has `admin`, `rewardRecipient`, `dailyRewardCapBps` | Needs `redemptionDelay` (optional, has default) | Small |

## 7. Open Questions
- [x] Module name: `StableCoinWrapper` or something else? → Use `StableCoinSystem` (more descriptive)
