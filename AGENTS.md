---
trigger: always_on
glob:
description:
---

# AGENTS.md

For tech stack, architecture, and code conventions, see `openspec/project.md`.

# Skill Loader

Automatically use skills in the following contexts:

| Skill               | Usage Context                                                              |
| :------------------ | :------------------------------------------------------------------------- |
| `openspec`          | proposal, spec, change, plan, kế hoạch                                     |
| `solidity-security` | solidity, contract, audit, security, gas, optimize, upgrade, vulnerability |

## Code Style

- **Solidity**: 4-space indent, double quotes, 120 char line width, NatDoc on all public functions; `CONSTANT_CASE` for constants, `mixedCase` for functions/vars, state visibility required
- **TypeScript**: 2-space indent, single quotes, semicolons, trailing commas (es5), 120 char width
- Tests use `node:test` (describe/it) + `node:assert`, fixture pattern via `createXxxFixture(connection)`
- No unused vars/imports in Solidity (enforced by solhint)
