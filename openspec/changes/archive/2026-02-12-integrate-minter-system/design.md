# Design: Integrate Minter into StableCoinSystem

## Goals / Non-Goals
- **Goals**: Wire Minter into the system deployment module with MINTER_ROLE grant; support upgrade path for already-deployed StableToken/StakingVault
- **Non-Goals**: Modify the Minter contract itself; add collateral tokens during deploy

## Architecture

```
StableCoinSystemModule
├── m.useModule(StakingVaultModule) → { stableToken, vault }
├── m.useModule(MinterModule)       → { minter, stableToken }  (reuses same StableTokenModule)
├── m.call(stableToken, 'setRewardRecipient', [vault])
└── m.call(stableToken, 'grantRole', [MINTER_ROLE, minter])
```

## Gap Analysis

| Component             | Have                              | Need                                        | Gap    |
| --------------------- | --------------------------------- | ------------------------------------------- | ------ |
| StableCoinSystem.ts   | Composes StableToken + StakingVault | + MinterModule + grantRole                 | Small  |
| MinterModule          | Standalone module exists          | Compose via useModule                        | None   |
| CONFIG.ts             | admin, dailyRewardCapBps, redemptionDelay | + treasuryVault                      | Small  |
| deploy.ts params      | 3 params passed to ignition       | + MinterModule params with treasuryVault     | Small  |

## Decisions

### Reuse existing MinterModule via `m.useModule()`
MinterModule already uses `m.useModule(StableTokenModule)` internally. When composed within StableCoinSystemModule, Ignition deduplicates the StableTokenModule ensuring a single StableToken deployment. This means no changes to `Minter.ts` are needed.

### MINTER_ROLE grant in StableCoinSystemModule
The `grantRole` call must be in StableCoinSystemModule (not MinterModule) because it's a cross-cutting wiring concern. The MINTER_ROLE constant (`keccak256("MINTER_ROLE")`) must be passed as a static value.

### Upgrade support
Since StableToken and StakingVault are already deployed, Ignition's idempotent nature handles this: `m.useModule()` recognizes existing deployments from the journal. Minter is a fresh deploy (new proxy). No `upgradeToAndCall` needed unless contract implementations changed.

## Risk Map

| Component                  | Risk Level | Reason                            | Verification                       |
| -------------------------- | ---------- | --------------------------------- | ---------------------------------- |
| StableCoinSystem compose   | LOW        | Pattern exists in codebase        | Proceed                            |
| grantRole call             | LOW        | Standard AccessControl pattern    | Test: minter can mint after deploy |
| CONFIG treasuryVault       | LOW        | Simple config addition            | Proceed                            |
| Ignition idempotency       | MEDIUM     | Depends on existing journal state | Test on sepolia with existing deploy |

## Migration Plan
1. Update CONFIG.ts with `treasuryVault` address
2. Update StableCoinSystem.ts to compose MinterModule and grant MINTER_ROLE
3. Update deploy.ts to pass MinterModule parameters
4. Run `npx hardhat deploy --network sepolia` – Ignition will skip already-deployed contracts and only deploy Minter

## Open Questions
- [ ] What address should be used as `treasuryVault` on Sepolia? (needs to be provided by team)
