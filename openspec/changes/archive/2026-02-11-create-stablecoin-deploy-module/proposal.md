# Change: Create StableCoin composite deploy module

## Why

The current deploy task deploys CounterModule (a sample contract). The project needs a single deploy command that deploys the full StableCoin system (StableToken + StakingVault) in the correct order, with StakingVault receiving the StableToken proxy address automatically.

## What Changes

- Add `ignition/modules/StableCoinSystem.ts` — composite module that deploys StableToken then StakingVault using `m.useModule()` composition
- Modify `tasks/deploy.ts` — switch from CounterModule to StableCoinSystem module, update parameter forwarding
- Modify `tasks/CONFIG.ts` — add optional `redemptionDelay` field

## Impact
- Affected specs: none (new capability)
- Affected code: `ignition/modules/` (new file), `tasks/deploy.ts`, `tasks/CONFIG.ts`
