# Internal Audit Checklist

Internal checklist for reviewing contracts before every mainnet deployment.
Each item must be confirmed (✅) or marked N/A by a reviewer.

---

## 1. Pre-Audit Setup

| # | Item | Status | Reviewer | Notes |
|---|------|--------|----------|-------|
| 1.1 | Code freeze — no new features during the audit window | ☐ | | |
| 1.2 | All dependencies pinned to exact versions (no `^` for production) | ☐ | | |
| 1.3 | Compiler version consistent across `hardhat.config.ts`, `foundry.toml`, and `pragma` | ☐ | | |
| 1.4 | NatSpec documentation complete for every public/external function | ☐ | | |
| 1.5 | README and deployment docs up to date | ☐ | | |

---

## 2. Static Analysis

| # | Item | Command | Status | Notes |
|---|------|---------|--------|-------|
| 2.1 | Slither — 0 High/Medium findings | `pnpm security:slither` | ☐ | |
| 2.2 | Solhint — 0 errors | `pnpm lint:sol` | ☐ | |
| 2.3 | Compiler warnings — 0 warnings | `pnpm build` | ☐ | |
| 2.4 | All Slither informational/low findings reviewed and documented | | ☐ | |

---

## 3. Testing

| # | Item | Command | Threshold | Status | Notes |
|---|------|---------|-----------|--------|-------|
| 3.1 | Unit tests pass | `pnpm test` | 100% pass | ☐ | |
| 3.2 | Fuzz tests pass | `pnpm test:fuzz` | 1000+ runs | ☐ | |
| 3.3 | Invariant tests pass | `pnpm test:invariant` | 256+ runs, depth 50+ | ☐ | |
| 3.4 | Line coverage ≥ 95% | `pnpm coverage:forge` | ≥ 95% | ☐ | |
| 3.5 | Branch coverage ≥ 90% | `pnpm coverage:forge` | ≥ 90% | ☐ | |
| 3.6 | Gas report reviewed — no unexpected spikes | `pnpm gas:forge` | | ☐ | |

---

## 4. Common Vulnerability Checks

### 4.1 Reentrancy

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | All external calls follow the Checks-Effects-Interactions pattern | ☐ | |
| 4.1.2 | `ReentrancyGuard` used on functions that transfer ETH/tokens | ☐ | |
| 4.1.3 | No cross-function reentrancy via shared mutable state | ☐ | |

### 4.2 Access Control

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | All sensitive functions protected by appropriate modifiers | ☐ | |
| 4.2.2 | `DEFAULT_ADMIN_ROLE` assigned only to multisig/timelock | ☐ | |
| 4.2.3 | `tx.origin` never used for authentication | ☐ | |
| 4.2.4 | Ownership transfer uses 2-step pattern (OZ `Ownable2Step` or `AccessControlDefaultAdminRules`) | ☐ | |

### 4.3 Integer Arithmetic

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Solidity ≥ 0.8.x for built-in overflow/underflow checks | ☐ | |
| 4.3.2 | No `unchecked` blocks without explicit justification | ☐ | |
| 4.3.3 | Division and modulo operations guard against denominator == 0 | ☐ | |
| 4.3.4 | Precision loss handled correctly (multiply before divide) | ☐ | |

### 4.4 External Calls

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Return values of all external calls checked | ☐ | |
| 4.4.2 | Use `call` instead of `transfer`/`send` for ETH transfers | ☐ | |
| 4.4.3 | No `delegatecall` outside of proxy patterns | ☐ | |
| 4.4.4 | All inputs from external sources validated (oracles, user input) | ☐ | |

### 4.5 Denial of Service (DoS)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.5.1 | No unbounded loops over dynamic arrays | ☐ | |
| 4.5.2 | Pull-over-push pattern for batch payouts | ☐ | |
| 4.5.3 | Gas limits considered for all external calls | ☐ | |

### 4.6 Front-Running

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.6.1 | Sensitive operations use commit-reveal or deadline mechanisms | ☐ | |
| 4.6.2 | Slippage protection for swap/trade operations | ☐ | |

---

## 5. Upgrade Safety (UUPS / Transparent Proxy)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Implementation contract calls `_disableInitializers()` in constructor | ☐ | |
| 5.2 | `initialize()` uses `initializer` modifier; re-init uses `reinitializer(N)` | ☐ | |
| 5.3 | Storage layout compatible between V(n) and V(n+1) — no reordering or removal of variables | ☐ | |
| 5.4 | No constructor logic beyond `_disableInitializers()` | ☐ | |
| 5.5 | `_authorizeUpgrade` restricted to correct role (admin only) | ☐ | |
| 5.6 | Storage gap (`__gap`) used if the contract will be inherited | ☐ | |
| 5.7 | Upgrade tested via Foundry UpgradeSafety test suite | ☐ | |
| 5.8 | Upgrade tested on testnet with production-like state before mainnet | ☐ | |

---

## 6. Formal Verification

| # | Item | Command | Status | Notes |
|---|------|---------|--------|-------|
| 6.1 | SMTChecker — 0 assertion violations | `hardhat compile --profile smt` | ☐ | |
| 6.2 | Overflow/underflow targets verified | | ☐ | |
| 6.3 | Division-by-zero targets verified | | ☐ | |

---

## 7. Gas Optimization

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Optimizer enabled (runs = 200 for general use, or tuned per contract) | ☐ | |
| 7.2 | No redundant SSTORE operations (minimize storage writes) | ☐ | |
| 7.3 | Use `calldata` instead of `memory` for read-only external parameters | ☐ | |
| 7.4 | Struct and storage variables packed to save slots | ☐ | |
| 7.5 | Events use `indexed` for filterable parameters (max 3) | ☐ | |
| 7.6 | `constant` / `immutable` used for values that never change | ☐ | |

---

## 8. Deployment & Verification

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Deploy script tested on local fork | ☐ | |
| 8.2 | Deployed successfully on testnet (Sepolia) | ☐ | |
| 8.3 | Contract verified on Etherscan / Sourcify | ☐ | |
| 8.4 | Proxy admin address confirmed correct | ☐ | |
| 8.5 | Initial state and configuration values verified on-chain | ☐ | |
| 8.6 | Multisig / Timelock configured for admin operations | ☐ | |

---

## 9. Operational Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Private keys never hardcoded; use keystore or env variables | ☐ | |
| 9.2 | `.env` file listed in `.gitignore` | ☐ | |
| 9.3 | Emergency pause mechanism implemented (if applicable) | ☐ | |
| 9.4 | Monitoring and alerting configured for anomalous on-chain events | ☐ | |
| 9.5 | Incident response plan documented | ☐ | |

---

## 10. Documentation & Compliance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | SECURITY.md complete (disclosure process, contact info) | ☐ | |
| 10.2 | Architecture diagram / flow diagram for the contract system | ☐ | |
| 10.3 | Threat model documented (assets, actors, attack surfaces) | ☐ | |
| 10.4 | Changelog maintained between upgrade versions | ☐ | |
| 10.5 | SPDX license header present in every `.sol` file | ☐ | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Developer | | | |
| Security Reviewer | | | |
| Project Manager | | | |

---

## Appendix: Tool Commands Quick Reference

```bash
# Static Analysis
pnpm security:slither          # Slither scan
pnpm lint:sol                  # Solhint linting

# Testing
pnpm test                      # Hardhat unit tests
pnpm test:forge                # All Foundry tests
pnpm test:fuzz                 # Fuzz tests only
pnpm test:invariant            # Invariant tests only

# Coverage & Gas
pnpm coverage:forge            # Foundry coverage report
pnpm gas:forge                 # Gas usage report

# Security Suite
pnpm security:all              # Slither + Fuzz + Invariant

# Formal Verification
hardhat compile --profile smt  # SMTChecker
```
