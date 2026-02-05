# Change: Add StableToken ERC20 Upgradeable Contract

## Why
The project needs a stablecoin token contract with controlled minting, gasless approval (permit), and upgradeable architecture following the established UUPS proxy pattern.

## What Changes
- Add `contracts/StableToken.sol` — upgradeable ERC20 with ERC20Permit, MINTER_ROLE, AccessControlDefaultAdminRules (1-day delay), UUPS
- Add `ignition/modules/StableToken.ts` — deployment module (impl + ERC1967Proxy)
- Add `test/StableToken.ts` — Hardhat tests (initialization, minting, access control, permit, upgrade)
- Update `test/fixture.ts` — add `createStableTokenFixture`

## Capabilities
- `specs/stable-token/spec.md` — StableToken contract specification

## Impact
- Affected specs: none (new capability)
- Affected code: `contracts/`, `ignition/modules/`, `test/`, `shared/constants.ts`
