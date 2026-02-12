# Change: Integrate Minter into StableCoinSystem deployment

## Why
The Minter contract is implemented but not wired into the system deployment. StableToken and StakingVault are already deployed on Sepolia, so we need to add Minter as a new deployment alongside upgrading the existing contracts (if implementation changes exist).

## What Changes
- Compose `MinterModule` into `StableCoinSystemModule` so a single deploy deploys/wires all 3 contracts
- Grant `MINTER_ROLE` to Minter on StableToken after deployment
- Add `treasuryVault` to deploy config (`CONFIG.ts`) and pass it to MinterModule
- Update `deploy.ts` task to forward `treasuryVault` parameter

## Impact
- Affected specs: `stablecoin-system-module` (MODIFIED), `minter` (unchanged)
- Affected code: `ignition/modules/StableCoinSystem.ts`, `tasks/deploy.ts`, `tasks/CONFIG.ts`
