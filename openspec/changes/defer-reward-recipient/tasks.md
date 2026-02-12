## 1. Contract Changes

- [x] 1.1 Remove `rewardRecipient_` parameter from `StableToken.initialize()` — new signature: `initialize(address admin, uint256 dailyRewardCapBps_)`
- [x] 1.2 Remove `rewardRecipient_` validation and assignment from `initialize()` body
- [x] 1.3 Keep `rewardRecipient` state variable (defaults to `address(0)`) — existing `mintReward()` guard handles this

## 2. Deployment & Config Changes

- [x] 2.1 Update `ignition/modules/StableToken.ts` — remove `rewardRecipient` parameter, update `encodeFunctionCall` to 2-arg signature
- [x] 2.2 Update `tasks/deploy.ts` — remove `rewardRecipient` from args type and `StableTokenModule` params
- [x] 2.3 Update `tasks/CONFIG.ts` — remove `rewardRecipient` field from config
- [x] 2.4 Add post-deploy step: call `setRewardRecipient(vault.address)` in `StableCoinSystem` module after StakingVault is deployed

## 3. Test Changes

- [x] 3.1 Update `test/fixture.ts` — remove `rewardRecipient` from `StableTokenModule` parameters; call `setRewardRecipient` after deploy
- [x] 3.2 Update `test/StableTokenReward.ts` — no changes needed; fixture still sets rewardRecipient via setter
- [x] 3.3 Update `test/foundry/StableToken.fuzz.t.sol` — 2-arg `encodeCall`; `setRewardRecipient(vault)` in `setUp()`

## 4. Spec Updates

- [x] 4.1 Update `openspec/specs/reward-minting/spec.md` — modify Initialization requirement to reflect 2-param signature
- [x] 4.2 Update `openspec/specs/stable-token/spec.md` — modify init scenario to 2-param signature
- [x] 4.3 Update `openspec/specs/stablecoin-system-module/spec.md` — remove `rewardRecipient` from deploy parameters, add post-deploy `setRewardRecipient` step
