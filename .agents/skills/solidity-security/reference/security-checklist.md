# Pre-Deployment Security Audit Checklist

Agent reference for auditing Solidity smart contracts before mainnet deployment.
Every item must be confirmed (✅), marked N/A, or flagged with a finding.

---

## 1. Pre-Audit Setup

- [ ] **Code freeze** — No new features merged during the audit window.
  - *Why:* Moving target invalidates prior review work.
  - *How:* Confirm the branch is locked; check git log for post-freeze commits.
- [ ] **Dependencies pinned** — All production deps use exact versions (no `^` or `~`).
  - *Why:* Floating ranges can pull in unaudited code at install time.
  - *How:* `grep '\\^' package.json` and `grep '~' package.json` — expect 0 matches for production deps.
- [ ] **Compiler version consistent** — Same Solidity version in `hardhat.config.ts`, `foundry.toml`, and every `pragma solidity` statement.
  - *Why:* Mismatched compilers produce different bytecode and may silently change semantics.
  - *How:* `grep -r "pragma solidity" contracts/` and compare with config files.
- [ ] **NatSpec complete** — Every `public` / `external` function has `@notice`, `@param`, `@return`.
  - *Why:* Auditors and integrators rely on NatSpec; missing docs hide intent.
  - *How:* `pnpm build` with NatSpec warnings enabled; manually spot-check complex functions.
- [ ] **Docs up to date** — README, deployment guide, and architecture docs reflect current code.
  - *Why:* Stale docs cause misunderstandings about expected behavior.

---

## 2. Static Analysis

- [ ] **Slither — 0 High/Medium findings**
  - *Command:* `pnpm security:slither`
  - *How:* Run, triage every finding. High/Medium must be fixed. Informational/Low must be documented with rationale.
- [ ] **Solhint — 0 errors**
  - *Command:* `pnpm lint:sol`
  - *How:* Fix all errors. Warnings should be reviewed; suppress only with inline comment + justification.
- [ ] **Compiler warnings — 0 warnings**
  - *Command:* `pnpm build`
  - *How:* Treat warnings as errors. Common culprits: unused variables, shadowing, visibility missing.
- [ ] **All Slither informational/low findings reviewed and documented**
  - *Why:* Low-severity findings can combine into exploitable patterns.
  - *How:* Create a findings log with disposition (fixed / accepted risk / false positive) for each.

---

## 3. Testing Thresholds

- [ ] **Unit tests pass — 100%**
  - *Command:* `pnpm test`
  - *Threshold:* All tests green. Zero skipped tests without documented reason.
- [ ] **Fuzz tests pass — 1,000+ runs**
  - *Command:* `pnpm test:fuzz`
  - *How:* Verify `foundry.toml` has `[fuzz] runs = 1000` or higher. Check output for run count.
- [ ] **Invariant tests pass — 256+ runs, depth 50+**
  - *Command:* `pnpm test:invariant`
  - *How:* Verify `foundry.toml` has `[invariant] runs = 256` and `depth = 50` or higher.
- [ ] **Line coverage ≥ 95%**
  - *Command:* `pnpm coverage:forge`
  - *How:* Check summary output. Identify uncovered lines and justify or add tests.
- [ ] **Branch coverage ≥ 90%**
  - *Command:* `pnpm coverage:forge`
  - *How:* Focus on uncovered branches in critical paths (access control, math, state transitions).
- [ ] **Gas report reviewed — no unexpected spikes**
  - *Command:* `pnpm gas:forge`
  - *How:* Compare against previous report. Flag any function exceeding block gas limit or showing >20% regression.

---

## 4. Vulnerability Checks

### 4.1 Reentrancy

- [ ] **CEI pattern enforced** — All functions follow Checks-Effects-Interactions ordering.
  - *Why:* State changes after external calls allow re-entrant callers to operate on stale state.
  - *How:* For every external call (`call`, `transfer`, `safeTransfer`, etc.), verify all state mutations happen before it.
- [ ] **ReentrancyGuard / ReentrancyGuardTransient** on functions that transfer ETH or tokens.
  - *Why:* Defense-in-depth; CEI alone can be fragile during refactors.
  - *How:* Check that `nonReentrant` modifier is present on every function containing value transfers.
- [ ] **No cross-function reentrancy** via shared mutable state.
  - *Why:* Attacker calls function A which calls external contract, which re-enters function B that reads state A hasn't finalized.
  - *How:* Map all functions that share storage variables and involve external calls; ensure guard covers the full call graph.
- [ ] **No read-only reentrancy** — View functions do not return stale state during callbacks.
  - *Why:* Protocols integrating your contract may call view functions mid-callback and receive inconsistent data.
  - *How:* Check if any view function reads state that is modified in a non-reentrant function *after* an external call.

### 4.2 Access Control

- [ ] **Every sensitive function has an access control modifier** (`onlyOwner`, `onlyRole(...)`, etc.).
  - *Why:* Missing modifier = publicly callable admin function.
  - *How:* List all state-changing functions; verify each has a modifier or is intentionally public.
- [ ] **Admin roles assigned only to multisig or timelock** — Never an EOA in production.
  - *Why:* Single compromised key = full protocol compromise.
  - *How:* Check deployment scripts and `initialize()` for admin address; must be multisig/timelock.
- [ ] **No `tx.origin` for authentication.**
  - *Why:* `tx.origin` is the EOA that initiated the transaction; a phishing contract can relay calls.
  - *How:* `grep -r "tx.origin" contracts/` — expect 0 matches.
- [ ] **2-step ownership transfer** — Use `Ownable2Step` or `AccessControlDefaultAdminRules`.
  - *Why:* Single-step transfer to a wrong address permanently locks the contract.
  - *How:* Check inheritance chain for `Ownable2Step` or equivalent pattern.
- [ ] **Role separation** — Distinct roles for admin, operator, and user actions.
  - *Why:* Principle of least privilege; operator key compromise should not grant upgrade ability.
  - *How:* Review `AccessControl` role definitions; ensure no single role can do everything.

### 4.3 Integer Arithmetic

- [ ] **Solidity ≥ 0.8.x** for built-in overflow/underflow checks.
  - *Why:* Pre-0.8 silently wraps on overflow.
  - *How:* Already covered by compiler version check (§1), but re-confirm pragma.
- [ ] **Every `unchecked` block has explicit justification** in code comments.
  - *Why:* `unchecked` disables overflow protection; must only be used where mathematically proven safe.
  - *How:* `grep -rn "unchecked" contracts/` — review each occurrence.
- [ ] **Division by zero guards** — Denominator checked before every `/` and `%` operation.
  - *Why:* Solidity reverts on division by zero, but the revert reason is opaque without a guard.
  - *How:* Search for `/` and `%` operators; ensure denominator is validated or cannot be zero.
- [ ] **Precision loss: multiply before divide.**
  - *Why:* `(a / b) * c` loses precision; `(a * c) / b` preserves it.
  - *How:* Review all arithmetic sequences involving both multiplication and division.
- [ ] **Rounding direction favors the protocol.**
  - *Why:* User-favorable rounding can be exploited via dust attacks over many transactions.
  - *How:* Check `mulDiv` usage; ensure round-down for withdrawals, round-up for deposits.

### 4.4 External Calls

- [ ] **Return values of all external calls checked.**
  - *Why:* Some ERC-20s return `false` instead of reverting; unchecked = silent failure.
  - *How:* Use `SafeERC20` for token transfers. For raw `call`, check the `bool success` return.
- [ ] **Use `call` instead of `transfer`/`send` for ETH transfers.**
  - *Why:* `transfer` and `send` forward only 2300 gas; fails for contracts with receive logic.
  - *How:* `grep -rn "\\.transfer\\(\\|\.send(" contracts/` — expect 0 matches (use `call{value:}` instead).
- [ ] **No `delegatecall` outside proxy patterns.**
  - *Why:* `delegatecall` executes foreign code in your storage context; misuse = storage corruption.
  - *How:* `grep -rn "delegatecall" contracts/` — should only appear in proxy/UUPS base contracts.
- [ ] **Input validation from oracles and external sources.**
  - *Why:* Garbage-in, garbage-out; oracle manipulation or stale data can drain funds.
  - *How:* Check that oracle responses are validated for sanity (non-zero price, reasonable range).
- [ ] **Staleness checks on oracle data.**
  - *Why:* Stale prices from Chainlink can be arbitraged.
  - *How:* Verify `updatedAt` is checked against a maximum acceptable age (e.g., heartbeat + buffer).

### 4.5 Denial of Service (DoS)

- [ ] **No unbounded loops over dynamic arrays.**
  - *Why:* Array can grow until iteration exceeds block gas limit, bricking the function.
  - *How:* Search for `for` loops; ensure the upper bound is capped or the array is bounded.
- [ ] **Pull-over-push for payments.**
  - *Why:* Push-based batch payments fail if one recipient reverts (e.g., blacklisted USDC address).
  - *How:* Verify payouts use a claimable/withdrawable pattern rather than iterating and sending.
- [ ] **Gas limits on external calls.**
  - *Why:* Unbounded gas forwarding lets callees consume all gas and cause parent to revert.
  - *How:* Review `call` invocations; consider explicit gas limits for untrusted callees.
- [ ] **Avoid revert-on-fail in batch operations.**
  - *Why:* One failing item in a batch should not block the rest.
  - *How:* Use try/catch or return success/failure per item when processing arrays of operations.

### 4.6 Front-Running

- [ ] **Commit-reveal for sensitive operations** (if applicable).
  - *Why:* Plaintext on-chain parameters can be front-run by MEV bots.
  - *How:* Check auction bids, votes, or any value-dependent submission for commit-reveal pattern.
- [ ] **Deadline / expiry on transactions.**
  - *Why:* Without a deadline, a transaction can be held in the mempool and executed when conditions are unfavorable.
  - *How:* Verify time-sensitive functions include a `deadline` parameter checked with `block.timestamp`.
- [ ] **Slippage protection for swap/trade operations.**
  - *Why:* Without a minimum output amount, sandwich attacks extract value.
  - *How:* Check swap functions for `minAmountOut` or equivalent parameter.

### 4.7 Flash Loan & Oracle Attacks

- [ ] **Never rely on in-block balances for pricing.**
  - *Why:* Flash loans can inflate `balanceOf` within a single transaction to manipulate spot prices.
  - *How:* Search for `balanceOf` used in price calculations; should use TWAP or oracle instead.
- [ ] **Use TWAP or Chainlink with staleness checks.**
  - *Why:* Spot prices from AMM reserves are trivially manipulable within a block.
  - *How:* Verify price feeds use time-weighted averages or reputable oracle with freshness validation.
- [ ] **Delay mechanisms for governance votes.**
  - *Why:* Flash-loaned governance tokens can pass malicious proposals in one block.
  - *How:* Confirm voting power is snapshot-based and proposals have a time delay before execution.

---

## 5. Upgrade Safety (UUPS)

- [ ] **`_disableInitializers()` called in implementation constructor.**
  - *Why:* Without this, anyone can call `initialize()` on the implementation contract directly and take ownership.
  - *How:* Check every implementation contract's constructor for `_disableInitializers()`.
- [ ] **`initialize()` uses `initializer` modifier; re-init uses `reinitializer(N)`.**
  - *Why:* Missing modifier allows re-initialization, resetting admin and state.
  - *How:* Check modifier on all init functions; ensure version N increments on each upgrade.
- [ ] **Storage layout compatible between V(n) and V(n+1).**
  - *Why:* Reordering, removing, or inserting variables before existing ones corrupts storage.
  - *How:* Diff storage layouts between versions. Use `forge inspect ContractV1 storage-layout` and compare.
- [ ] **No constructor logic beyond `_disableInitializers()`.**
  - *Why:* Constructor code runs in implementation context, not proxy context; state set in constructor is invisible to proxy.
  - *How:* Review constructors — should be empty or contain only `_disableInitializers()`.
- [ ] **`_authorizeUpgrade` restricted to admin role.**
  - *Why:* Unrestricted `_authorizeUpgrade` lets anyone upgrade to a malicious implementation.
  - *How:* Check the function has `onlyOwner`, `onlyRole(ADMIN_ROLE)`, or equivalent.
- [ ] **Storage gaps (`__gap`) used for inheritable contracts.**
  - *Why:* Without gaps, adding variables to a parent contract shifts child storage.
  - *How:* Check base contracts for `uint256[50] private __gap;` (or appropriate size).
- [ ] **ERC-7201 namespaced storage** used where applicable.
  - *Why:* Eliminates storage collision risk entirely for new contracts.
  - *How:* Check for `@custom:storage-location erc7201:...` annotations and corresponding struct pattern.
- [ ] **Upgrade tested on testnet with production-like state.**
  - *Why:* Storage migration bugs only surface with real data.
  - *How:* Deploy V(n) on testnet, populate state, upgrade to V(n+1), verify all data intact.

---

## 6. Formal Verification

- [ ] **SMTChecker — 0 assertion violations.**
  - *Command:* `hardhat compile --profile smt`
  - *Why:* Proves invariants hold for all possible inputs, not just tested ones.
  - *How:* Add `assert()` statements for critical invariants; run SMTChecker and resolve all warnings.
- [ ] **Overflow/underflow targets verified.**
  - *Why:* SMTChecker can prove arithmetic is safe even in `unchecked` blocks.
  - *How:* Enable `overflow` and `underflow` targets in SMTChecker config.
- [ ] **Division-by-zero targets verified.**
  - *Why:* Proves no execution path reaches a division with zero denominator.
  - *How:* Enable `divByZero` target in SMTChecker config.

---

## 7. Gas Optimization Review

- [ ] **Optimizer enabled** — Runs tuned per contract (200 for general, higher for frequently called).
  - *Why:* Optimizer reduces deployment and runtime gas; too many runs bloats bytecode.
  - *How:* Check `hardhat.config.ts` and `foundry.toml` for optimizer settings.
- [ ] **No redundant SSTORE operations** — Minimize storage writes.
  - *Why:* SSTORE costs 5,000–20,000 gas; cache in memory and write once.
  - *How:* Review functions that write to storage in loops or write the same slot multiple times.
- [ ] **`calldata` used instead of `memory`** for read-only external function parameters.
  - *Why:* `calldata` avoids copying to memory, saving gas.
  - *How:* `grep -rn "memory" contracts/` in external function signatures; change to `calldata` where param is not modified.
- [ ] **Struct and storage variables packed** to minimize slots.
  - *Why:* Each slot costs gas; packing `uint128 + uint128` into one slot halves reads/writes.
  - *How:* Review struct definitions; order variables by size to fit into 32-byte slots.
- [ ] **Events use `indexed`** for filterable parameters (max 3 per event).
  - *Why:* `indexed` params become log topics, enabling efficient off-chain filtering.
  - *How:* Review event definitions; key identifiers (addresses, IDs) should be indexed.
- [ ] **`constant` / `immutable` used** for values that never change.
  - *Why:* `constant` is inlined at compile time; `immutable` is stored in bytecode — both skip SLOAD.
  - *How:* Search for state variables set once (in constructor or declaration) that are never modified.

---

## 8. Deployment & Verification

- [ ] **Deploy script tested on local fork.**
  - *Why:* Catches configuration errors before spending real gas.
  - *How:* `npx hardhat ignition deploy --network hardhat` or equivalent; verify all transactions succeed.
- [ ] **Deployed successfully on testnet (Sepolia).**
  - *Why:* Tests real network conditions (gas estimation, block times, RPC behavior).
  - *How:* Run full deployment; interact with all functions; verify event emissions.
- [ ] **Contract verified on Etherscan / Sourcify.**
  - *Why:* Users and integrators can read source code; unverified contracts lose trust.
  - *How:* `npx hardhat verify --network sepolia <address> <constructor-args>`.
- [ ] **Proxy admin address confirmed correct.**
  - *Why:* Wrong proxy admin means wrong entity controls upgrades.
  - *How:* Call `ERC1967Utils.getAdmin()` on proxy; compare with expected multisig address.
- [ ] **Initial state and configuration values verified on-chain.**
  - *Why:* Misconfigured parameters (fees, limits, addresses) can cause immediate loss.
  - *How:* Call each getter; compare returned values against deployment spec.
- [ ] **Multisig / Timelock configured for admin operations.**
  - *Why:* EOA admin in production = single point of failure.
  - *How:* Confirm admin address is a Gnosis Safe or Governor+Timelock; verify threshold (e.g., 3/5).

---

## 9. Operational Security

- [ ] **Private keys never hardcoded** — Use keystore, hardware wallet, or env variables.
  - *Why:* Hardcoded keys in source = compromised keys forever (git history).
  - *How:* `grep -rn "0x[a-fA-F0-9]{64}" contracts/ scripts/ test/` — expect 0 real private keys.
- [ ] **`.env` file listed in `.gitignore`.**
  - *Why:* Prevents accidental commit of secrets.
  - *How:* `grep ".env" .gitignore` — must be present.
- [ ] **Emergency pause mechanism implemented** (if applicable).
  - *Why:* Allows stopping the protocol during an active exploit.
  - *How:* Check for `Pausable` / `PausableUpgradeable` inheritance and `whenNotPaused` modifiers on critical functions.
- [ ] **Monitoring and alerting configured** for anomalous on-chain events.
  - *Why:* Early detection limits exploit damage.
  - *How:* Verify integration with monitoring service (OpenZeppelin Defender, Forta, or custom).
- [ ] **Incident response plan documented.**
  - *Why:* During an exploit, clear procedures prevent panicked mistakes.
  - *How:* Confirm a runbook exists covering: pause, assess, communicate, fix, unpause.

---

## 10. Documentation & Compliance

- [ ] **SECURITY.md complete** — Disclosure process, contact info, supported versions.
  - *Why:* White-hat researchers need a way to report vulnerabilities responsibly.
  - *How:* Verify `SECURITY.md` exists with email/PGP, response SLA, and scope.
- [ ] **Architecture diagram / flow diagram** for the contract system.
  - *Why:* Visual overview helps auditors understand trust boundaries and data flow.
  - *How:* Check `docs/` for up-to-date diagrams matching current contract structure.
- [ ] **Threat model documented** — Assets, actors, attack surfaces.
  - *Why:* Systematic threat analysis ensures no attack vector is overlooked.
  - *How:* Verify document covers: what is at risk, who can interact, what can go wrong.
- [ ] **Changelog maintained** between upgrade versions.
  - *Why:* Auditors reviewing an upgrade need to know exactly what changed.
  - *How:* Check for a changelog or diff summary in the PR / release notes.
- [ ] **SPDX license header present** in every `.sol` file.
  - *Why:* Required by compiler (warning without it); legal clarity for open-source.
  - *How:* `grep -rL "SPDX-License-Identifier" contracts/` — expect 0 results.

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Developer | | | |
| Security Reviewer | | | |
| Project Manager | | | |

---

## Quick Reference: Commands

```bash
# Static Analysis
pnpm security:slither          # Slither scan
pnpm lint:sol                  # Solhint linting
pnpm build                     # Compile (check for warnings)

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

# Grep Checks
grep -r "tx.origin" contracts/           # Should be 0
grep -rn "unchecked" contracts/          # Review each
grep -rn "delegatecall" contracts/       # Only in proxy
grep -rL "SPDX-License-Identifier" contracts/  # Should be 0
```
