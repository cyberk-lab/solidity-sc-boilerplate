---
trigger: always_on
glob:
description:
---

# Skill Loader

Automatically use skills in the following contexts:

| Skill      | Usage Context                          |
| :--------- | :------------------------------------- |
| `openspec` | proposal, spec, change, plan, kế hoạch |
| `solidity-security` | solidity, contract, audit, security, gas, optimize, upgrade, vulnerability |

# AGENTS.md

## Commands
- Build: `pnpm run build` (hardhat compile)
- Test (Hardhat): `pnpm run test` | single: `pnpm run test -- --grep "test name"`
- Test (Foundry): `pnpm run test:forge` | single: `forge test --match-test testFuncName -vvv`
- Fuzz: `pnpm run test:fuzz` | Invariant: `pnpm run test:invariant`
- Lint: `pnpm run lint:sol` | Security: `pnpm run security:slither`

## Architecture
- **Solidity ^0.8.28** with Hardhat v3 + Foundry dual-test setup, OpenZeppelin upgradeable contracts (UUPS pattern)
- `contracts/` — Solidity sources | `test/` — Hardhat tests (TypeScript, node:test + viem) | `test/foundry/` — Forge tests (fuzz/invariant)
- `shared/` — TS utils/constants for tests/scripts | `plugins/` — custom Hardhat plugins | `ignition/` — deployment modules
- Hardhat tests use `viem` client (not ethers); assertions via `viem.assertions.emitWithArgs` / `revertWithCustomError`

## Code Style
- **Solidity**: 4-space indent, double quotes, 120 char line width, NatDoc on all public functions; `CONSTANT_CASE` for constants, `mixedCase` for functions/vars, state visibility required
- **TypeScript**: 2-space indent, single quotes, semicolons, trailing commas (es5), 120 char width
- Tests use `node:test` (describe/it) + `node:assert`, fixture pattern via `createXxxFixture(connection)`
- No unused vars/imports in Solidity (enforced by solhint)
