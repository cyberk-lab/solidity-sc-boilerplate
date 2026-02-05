## 1. StableToken Contract Changes

- [x] 1.1 Add `REWARD_DISTRIBUTOR_ROLE` constant
- [x] 1.2 Add state variables: `rewardRecipient`, `dailyRewardCapBps`, `mintedInCurrentPeriod`, `lastMintTimestamp`
- [x] 1.3 Add `uint256[40] private __gap` storage gap
- [x] 1.4 Add events: `RewardMinted`, `RewardRecipientUpdated`, `DailyRewardCapUpdated`
- [x] 1.5 Add errors: `ExceedsDailyRewardCap`, `InvalidRewardRecipient`, `ExcessiveRewardCap`, `ZeroRewardAmount`
- [x] 1.6 Implement `setRewardRecipient(address)` — admin only
- [x] 1.7 Implement `setDailyRewardCap(uint256 capBps)` — admin only, max 500 bps
- [x] 1.8 Implement `_currentMintedInPeriod() internal view returns (uint256)` — pure computation, no state mutation
- [x] 1.9 Implement `mintReward(uint256 amount)` — REWARD_DISTRIBUTOR_ROLE, rate-limited
- [x] 1.10 Implement `availableRewardMint()` view function
- [x] 1.11 Update `initialize()` to accept `rewardRecipient_` and `dailyRewardCapBps_` params

## 2. Interface Update

- [x] 2.1 Add reward-related function signatures to `IStableToken.sol`

## 3. Tests

- [x] 3.1 Test `mintReward` reverts without `REWARD_DISTRIBUTOR_ROLE`
- [x] 3.2 Test `mintReward` reverts when amount is zero
- [x] 3.3 Test `mintReward` reverts when amount exceeds daily cap
- [x] 3.4 Test `mintReward` succeeds and tokens appear in vault
- [x] 3.5 Test linear decay: ~50% capacity restored after 12h
- [x] 3.6 Test linear decay: 100% capacity restored after 24h+
- [x] 3.7 Test multiple mints within window accumulate correctly
- [x] 3.8 Test `setDailyRewardCap` reverts above `MAX_DAILY_REWARD_CAP_BPS`
- [x] 3.9 Test `availableRewardMint()` returns correct values
- [x] 3.10 Test zero supply → zero cap (mintReward reverts)
- [x] 3.11 Test `initialize` sets reward config correctly
- [x] 3.12 Test admin-only access for `setRewardRecipient` and `setDailyRewardCap`
- [x] 3.13 Test cap reduction while capacity partially used
- [x] 3.14 Test `mintReward(0)` reverts with `ZeroRewardAmount`
- [x] 3.15 Test `setRewardRecipient(address(0))` reverts with `InvalidRewardRecipient`
- [x] 3.16 Fuzz test: `mintReward` with random amounts/timestamps never exceeds daily cap (Foundry)
- [x] 3.17 Fuzz test: `mintReward` reverts above cap
- [x] 3.18 Fuzz test: linear decay restores capacity
- [x] 3.19 Fuzz test: only distributor can mint reward
- [x] 3.20 Fuzz test: cap reduction saturates (no underflow)

## 4. Verification

- [x] 4.1 Run `pnpm run build` — compiles without errors
- [x] 4.2 Run `pnpm run test` — all 84 tests pass
- [x] 4.3 Run `pnpm run lint:sol` — 0 errors (only pre-existing warnings)
