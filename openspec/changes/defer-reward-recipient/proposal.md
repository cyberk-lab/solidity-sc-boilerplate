# Change: Defer rewardRecipient from StableToken.initialize

## Why

StakingVault (the reward recipient) is deployed after StableToken, so its address is unknown at StableToken initialization time. Requiring it in `initialize()` forces a placeholder or circular dependency in the deployment flow.

## What Changes

- **BREAKING**: Remove `rewardRecipient_` parameter from `StableToken.initialize(address admin, uint256 dailyRewardCapBps_)`
- Remove `rewardRecipient` validation from `initialize()` — `rewardRecipient` starts as `address(0)`
- Update Ignition module, deploy task, config, and all test fixtures to match new signature
- Post-deployment: admin calls `setRewardRecipient(vaultAddress)` to configure

## Impact

- Affected specs: `reward-minting` (Initialization requirement), `stable-token` (init scenario), `stablecoin-system-module` (deploy params)
- Affected code: `StableToken.sol`, `StableToken.ts` (ignition), `deploy.ts`, `CONFIG.ts`, `fixture.ts`, `StableTokenReward.ts`, `StableToken.fuzz.t.sol`
