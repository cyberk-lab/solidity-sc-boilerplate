## 1. StableToken Contract Changes

- [x] 1.1 Change `MAX_DAILY_REWARD_CAP_BPS` from `500` to `100`
- [x] 1.2 Replace `_currentMintedInPeriod()`: return `0` if `block.timestamp / 86400 != lastMintTimestamp`, else return `mintedInCurrentPeriod`
- [x] 1.3 Update `mintReward()` state: set `lastMintTimestamp = block.timestamp / 86400` instead of `block.timestamp`
- [x] 1.4 Update NatSpec on `lastMintTimestamp` to clarify it stores UTC day number

## 2. Tests

- [x] 2.1 Update Hardhat tests: verify cap resets on new UTC day (advance time past midnight boundary), verify multiple mints accumulate within same day, verify `MAX_DAILY_REWARD_CAP_BPS = 100`
- [x] 2.2 Update Foundry fuzz/invariant tests if any exist for reward minting

## 3. Verification

- [x] 3.1 Run `pnpm run build` — no compilation errors
- [x] 3.2 Run `pnpm run test` — all 84 Hardhat tests pass
- [x] 3.3 Run `forge test` — all 5 Foundry fuzz tests pass
- [x] 3.4 Run `npx solhint` — 0 errors (only pre-existing warnings)
