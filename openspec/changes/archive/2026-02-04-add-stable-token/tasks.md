## 1. Contract

- [x] 1.1 Create `contracts/StableToken.sol` — ERC20Upgradeable + ERC20PermitUpgradeable + AccessControlDefaultAdminRulesUpgradeable + UUPSUpgradeable, MINTER_ROLE, `initialize(admin)`, `mint(to, amount)`, `_authorizeUpgrade`, `_disableInitializers()`
- [x] 1.2 Verify compilation: `pnpm run build`
- [x] 1.3 Verify lint: `pnpm run lint:sol`

## 2. Ignition Module

- [x] 2.1 Create `ignition/modules/StableToken.ts` — deploy impl + ERC1967Proxy with `initialize(admin)`, return `stableToken` contract instance

## 3. Test Fixture

- [x] 3.1 Add `createStableTokenFixture(connection)` in `test/fixture.ts` — deploy via ignition, return `{ stableToken, admin, minter, users, publicClient, viem }`

## 4. Hardhat Tests

- [x] 4.1 Create `test/StableToken.ts` with test cases:
  - Initialization: name, symbol, decimals, totalSupply, adminDelay, admin role
  - Re-initialization reverts
  - Minter can mint + Transfer event emitted
  - Non-minter mint reverts
  - Admin without MINTER_ROLE cannot mint
  - ERC20 transfer between accounts
  - Permit: gasless approval via EIP-712 signature
  - Non-admin upgrade reverts
  - Admin can upgrade
- [x] 4.2 Verify all tests pass: `pnpm run test`
