---
name: solidity-security
description: "Reviews Solidity contracts for security vulnerabilities, gas optimization, and upgrade safety. Use when writing, reviewing, auditing, or optimizing Solidity smart contracts, or when asked about gas, security, upgrades, or EVM best practices."
---

# Solidity Security & Optimization Skill

Expert guidance for writing secure, gas-efficient, upgrade-safe Solidity smart contracts (0.8.28+, EVM 2025).

## When This Skill Activates

- Writing or reviewing Solidity contracts
- Gas optimization requests
- Security audit or vulnerability checks
- Upgrade pattern design (UUPS, Transparent, Beacon)
- DeFi contract architecture (staking, bonding curves, vaults)
- Pre-deployment checklists

## Project Context

This project uses:
- **Solidity ^0.8.28** with Hardhat v3 + Foundry dual-test setup
- **OpenZeppelin Upgradeable Contracts v5** (UUPS pattern)
- **Slither** for static analysis, **Solhint** for linting
- **Foundry** for fuzz testing, invariant testing, coverage, and gas reports

## Core Rules (Always Apply)

### 1. Security-First Development

Every contract MUST follow these non-negotiable rules:

- **Checks-Effects-Interactions (CEI)**: Always update state before external calls
- **Access Control**: Every state-changing function must have explicit access control
- **No `tx.origin`**: Never use for authentication
- **No `delegatecall`**: Except in proxy patterns
- **Validate all inputs**: Especially from oracles and user-supplied data
- **Check return values**: All low-level calls (`call`, `delegatecall`, `staticcall`)
- **Use OpenZeppelin**: Prefer battle-tested implementations over custom code

### 2. Gas Optimization Priorities

Apply in this order (highest impact first):

1. **Storage layout** — Pack variables into 32-byte slots (address + uint96 = 1 slot)
2. **Minimize SSTORE** — Zero-to-nonzero costs 20,000 gas; avoid unnecessary writes
3. **Cache storage reads** — Read storage into local variable if accessed more than once
4. **Use `calldata`** over `memory` for read-only external function parameters
5. **Use `constant` / `immutable`** for values that never change
6. **Loop optimization** — Cache array length, use `unchecked { ++i; }`
7. **Transient Storage (EIP-1153)** — Use for reentrancy guards and intra-tx data (100 gas vs 2,900+)
8. **Custom errors** over `require` strings — Saves ~50 gas per revert

### 3. Upgrade Safety (UUPS)

When writing upgradeable contracts:

- Call `_disableInitializers()` in constructor
- Use `initializer` modifier on `initialize()`, `reinitializer(N)` for upgrades
- NEVER reorder or remove existing storage variables
- Append new variables AFTER existing ones
- Use storage gaps (`uint256[50] private __gap`) in base contracts meant to be inherited
- Use ERC-7201 Namespaced Storage for complex systems
- Restrict `_authorizeUpgrade` to admin role only
- Test upgrades with state preservation verification

### 4. NatSpec Documentation

All public/external functions MUST have:
- `@notice` — What the function does (user-facing)
- `@dev` — Implementation details (developer-facing)
- `@param` — Each parameter documented
- `@return` — Each return value documented

Contracts MUST have `@title` and `@notice`. Events MUST have `@notice` and `@param`.

### 5. Testing Requirements

Every contract must have:
- **Unit tests** (Hardhat, node:test) — All functions and edge cases
- **Fuzz tests** (Foundry) — Property-based testing with 1000+ runs
- **Invariant tests** (Foundry) — System-wide invariants with handler contracts
- **Upgrade safety tests** — State preservation across upgrades
- **Coverage target** — ≥95% line coverage, ≥90% branch coverage

## OWASP Smart Contract Top 10 (2025)

When reviewing contracts, check for these vulnerabilities:

| ID | Vulnerability | Mitigation |
|----|--------------|------------|
| SC01 | Access Control | OZ AccessControl, 2-step ownership, no tx.origin |
| SC02 | Oracle Manipulation | Chainlink/TWAP, staleness checks, no single-source spot price |
| SC03 | Logic Errors | Invariant testing, formal verification |
| SC04 | Lack of Input Validation | require/revert on all external inputs |
| SC05 | Reentrancy | CEI pattern, ReentrancyGuard, Transient Guard |
| SC06 | Unchecked Calls | Always check return values of low-level calls |
| SC07 | Flash Loan Attacks | Don't rely on in-block balances, use TWAP for governance |
| SC08 | Integer Overflow | Solidity ≥0.8 default checks, justify any `unchecked` |
| SC09 | DoS | No unbounded loops, pull-over-push, gas-aware calls |
| SC10 | Front-Running | Commit-reveal, deadlines, slippage protection |

## Workflow: Security Review

When asked to review or audit a contract:

1. **Read the contract** and all its dependencies
2. **Check the OWASP Top 10** table above against each function
3. **Verify access control** on every state-changing function
4. **Check storage layout** for upgrade compatibility (if proxy)
5. **Review gas patterns** and suggest optimizations
6. **Run tools**: `pnpm security:slither`, `pnpm lint:sol`
7. **Verify test coverage**: `pnpm coverage:forge`
8. **Consult reference docs** — Read `reference/security-checklist.md` for the full audit checklist, `reference/gas-optimization.md` for gas details

## Workflow: Writing New Contract

When writing a new Solidity contract:

1. Check existing contracts for code style, patterns, and imports
2. Use OpenZeppelin base contracts where applicable
3. Apply gas optimization rules from section 2
4. Add full NatSpec documentation
5. If upgradeable: follow section 3 rules strictly
6. Write Hardhat unit tests in `test/` and Foundry fuzz/invariant tests in `test/foundry/`
7. Run `pnpm build` to verify compilation
8. Run `pnpm security:slither` before committing

## Tool Commands

```bash
# Build & Test
pnpm build                     # Hardhat compile
pnpm test                      # Hardhat unit tests
pnpm test:forge                # All Foundry tests
pnpm test:fuzz                 # Fuzz tests (1000 runs)
pnpm test:invariant            # Invariant tests (256 runs)

# Security & Quality
pnpm security:slither          # Slither static analysis
pnpm security:all              # Slither + Fuzz + Invariant
pnpm lint:sol                  # Solhint linter

# Coverage & Gas
pnpm coverage:forge            # Line/branch/function coverage
pnpm gas:forge                 # Gas usage report

# Formal Verification
hardhat compile --profile smt  # SMTChecker (CHC engine)
```

## Reference Documents

For deeper guidance, read the reference files:

- `reference/gas-optimization.md` — Storage packing, EIP-1153 transient storage, Yul patterns, loop optimization with gas cost tables
- `reference/security-checklist.md` — Full pre-deployment audit checklist (10 sections, 50+ items)
- `reference/upgrade-patterns.md` — UUPS, ERC-7201 namespaced storage, storage gap strategies, initializer patterns
- `reference/defi-patterns.md` — Bonding curves, MasterChef staking, CDP mechanics, oracle integration

## Quick Audit Script

Run `scripts/audit.sh` for a one-command full security sweep (Slither + Solhint + Foundry fuzz + invariant + coverage report).
