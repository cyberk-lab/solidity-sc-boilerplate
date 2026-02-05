# Tasks: Add Minter

## 1. StableToken Update

- [x] 1.1 Add `burn(address from, uint256 amount) external onlyRole(MINTER_ROLE)` to `StableToken.sol`
- [x] 1.2 Add burn tests to `test/StableToken.ts` (minter can burn, non-minter rejected, admin-without-minter rejected)
- [x] 1.3 Update `stable-token` spec to include burn requirement

## 2. Mock Tokens

- [x] 2.1 Create `contracts/mock/MockERC20.sol` — configurable name, symbol, decimals, public `mint` function for testing
- [x] 2.2 Verify mock compiles: `pnpm run build`

## 3. Minter Contract

- [x] 3.1 Create `contracts/interfaces/IStableToken.sol` with `mint` and `burn` function signatures
- [x] 3.2 Create `contracts/Minter.sol` — full implementation per design
- [x] 3.3 Verify contract compiles: `pnpm run build`
- [x] 3.4 Lint: `pnpm run lint:sol`

## 4. Deployment Module

- [x] 4.1 Create `ignition/modules/Minter.ts` — deploy Minter proxy, grant MINTER_ROLE on StableToken to Minter

## 5. Hardhat Tests

- [x] 5.1 Create `test/fixture.ts` — add `createMinterFixture(connection)`
- [x] 5.2 Create `test/Minter.ts` — 22 tests across 8 groups
- [x] 5.3 Run tests: `pnpm run test` — 41 passing

## 6. Foundry Tests (Optional — Fuzz)

- [ ] 6.1 Create `test/foundry/Minter.fuzz.t.sol` — fuzz deposit/redeem with varying amounts and decimal configurations
- [ ] 6.2 Run: `pnpm run test:forge`

## 7. Validation

- [x] 7.1 `pnpm run build` — clean compile
- [x] 7.2 `pnpm run test` — all 41 tests pass
- [x] 7.3 `pnpm run lint:sol` — 0 errors (Minter has no warnings)
- [x] 7.4 `openspec validate add-minter --strict --no-interactive`
