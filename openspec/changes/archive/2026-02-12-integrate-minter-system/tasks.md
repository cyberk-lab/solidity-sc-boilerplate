## 1. Config & Parameters

- [x] 1.1 Add `treasuryVault` address to `tasks/CONFIG.ts` sepolia config (placeholder address – team to confirm)
- [x] 1.2 Add `collateralTokens` array to `tasks/CONFIG.ts` with `0x656fdec9e0963117126cd6d52e517447b10c4341`
- [x] 1.3 Update `runDeployTask` in `tasks/deploy.ts`: extend args type to include `treasuryVault`, `collateralTokens`, add `MinterModule` params, and post-deploy `addCollateralToken` calls

## 2. Ignition Module Integration

- [x] 2.1 Update `ignition/modules/StableCoinSystem.ts`:
  - Import `MinterModule` from `./Minter.js`
  - Add `const { minter } = m.useModule(MinterModule)` to compose Minter
  - Compute `MINTER_ROLE` hash via `keccak256(toHex('MINTER_ROLE'))` from viem
  - Add `m.call(stableToken, 'grantRole', [MINTER_ROLE, minter], { id: 'GrantMinterRole' })`
  - Return `{ stableToken, vault, minter }`

## 3. Post-Deploy Wiring

- [x] 3.1 After Ignition deploy, iterate `collateralTokens` and call `minter.write.addCollateralToken()` for each token not yet whitelisted (idempotent check via `isCollateralToken`)

## 4. Pre-flight Checks (Sepolia)

- [ ] 4.1 Confirm Ignition journal exists for Sepolia (`ignition/deployments/chain-11155111/`)
- [ ] 4.2 Verify `admin` in CONFIG matches the address with `DEFAULT_ADMIN_ROLE` on the deployed StableToken proxy
- [ ] 4.3 Ensure CONFIG parameters (`dailyRewardCapBps`, `redemptionDelay`) match original deploy
- [ ] 4.4 Replace `treasuryVault` placeholder in CONFIG.ts with actual address

## 5. Verification

- [ ] 5.1 Run `npx hardhat ignition visualize StableCoinSystemModule` to confirm only Minter deploy + wiring txs
- [ ] 5.2 Test deploy on local hardhat network to confirm Minter gets MINTER_ROLE, can mint/burn, and collateral token is whitelisted
