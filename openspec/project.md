# Project Context

## Purpose
Solidity smart contract boilerplate with upgradeable proxy patterns (UUPS), dual-test setup (Hardhat + Foundry), and type-safe tooling via Viem.

## Tech Stack
- Solidity ^0.8.28, Hardhat v3, Foundry (forge)
- OpenZeppelin Contracts Upgradeable (UUPS proxy pattern)
- Viem (type-safe Ethereum client, replaces ethers)
- Hardhat Ignition (declarative deployments)
- TypeScript, node:test, Prettier, solhint

## Project Conventions

### Code Style
- **Solidity**: 4-space indent, double quotes, 120 char width, NatDoc on all public functions. `CONSTANT_CASE` for constants, `mixedCase` for functions/vars, explicit state visibility. No unused vars/imports (solhint enforced).
- **TypeScript**: 2-space indent, single quotes, semicolons, trailing commas (es5), 120 char width.

### Architecture Patterns
- UUPS upgradeable proxy with `AccessControlDefaultAdminRulesUpgradeable` for admin management.
- `contracts/` — Solidity sources | `test/` — Hardhat TS tests | `test/foundry/` — Forge fuzz/invariant tests.
- `shared/` — TS utils/constants | `plugins/` — custom Hardhat plugins | `ignition/` — deployment modules | `tasks/` — Hardhat tasks.

### Testing Strategy
- Hardhat tests: `node:test` (describe/it) + `node:assert` + `viem.assertions` (emitWithArgs, revertWithCustomError). Fixture pattern via `createXxxFixture(connection)`.
- Foundry tests: fuzz (`*.fuzz.t.sol`, 1000 runs) and invariant (`*.invariant.t.sol`, 256 runs, depth 50).

### Git Workflow
- Feature branches, PR-based review.

## Important Constraints
- All upgradeable contracts must use `_disableInitializers()` in constructor and `reinitializer(N)` for versioned init.
- Storage layout must be append-only across upgrades to preserve proxy compatibility.
