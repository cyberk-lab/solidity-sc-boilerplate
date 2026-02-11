## 1. Ignition Module

- [x] 1.1 Create `ignition/modules/StableCoinSystem.ts` that uses `m.useModule(StableTokenModule)` + `m.useModule(StakingVaultModule)`, returning `{ stableToken, vault }`
- [x] 1.2 Updated `StakingVault.ts` to use `m.useModule(StableTokenModule)` instead of `m.getParameter('stableToken')` — follows same pattern as Minter.ts

## 2. Deploy Task

- [x] 2.1 Added `redemptionDelay` to `tasks/CONFIG.ts`
- [x] 2.2 Updated `tasks/deploy.ts` — imports `StableCoinSystemModule`, params use `StableTokenModule` and `StakingVaultModule` namespaces
- [x] 2.3 Removed `CounterModule` import from `tasks/deploy.ts`

## 3. Verification

- [x] 3.1 `npx hardhat compile` — no errors
- [x] 3.2 `npx tsc --noEmit` — no type errors
- [x] 3.3 `npx hardhat test` — 84 passing
- [x] 3.4 Updated `test/fixture.ts` — decoupled `createCounterFixture` from `runDeployTask`, now uses CounterModule directly
