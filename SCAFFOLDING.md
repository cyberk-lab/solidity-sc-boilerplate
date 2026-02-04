# Scaffolding Log

This document records the steps taken to initialize and structure this boilerplate.

## 1. Project Initialization

Initialized a new Hardhat project with **Viem** and **TypeScript** support:

```bash
pnpm dlx hardhat --init
# Options selected: TypeScript hardhat3 project -> use Viem -> use Node.js test runner
```

## 2. Core Dependencies

Installed OpenZeppelin libraries for secure and upgradeable smart contract standards:

```bash
pnpm add -D @openzeppelin/contracts @openzeppelin/contracts-upgradeable
```

## 3. Environment & Security

Configured **Hardhat Config Variables (Keystore)** for secure private key management.

- **Strategy**: Renamed standard keys (e.g., `SEPOLIA_PRIVATE_KEY`) to project-specific prefixes (`BOILERPLATE_...`) in `hardhat.config.ts` to prevent conflicts between different local projects.

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set BOILERPLATE_SEPOLIA_PRIVATE_KEY
```

## 4. Testing & Plugins

Enhanced the development experience with network helpers and assertions:

```bash
pnpm add -D @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-viem-assertions
```

- **Integration**: Registered in `hardhat.config.ts` and added custom plugins under `./plugins/`.

## 5. Code Quality

Configured automatic formatting for Solidity and TypeScript:

```bash
pnpm add -D prettier prettier-plugin-solidity
```

## 6. Implementation Reference

Sample code added to demonstrate best practices:

- **Contracts**: `Counter.sol` (UUPS Upgradeable pattern).
- **Deployment**: Hardhat Ignition modules (`ignition/modules/`).
- **Testing**: Viem-based tests with custom fixtures (`test/`).
- **Tasks**: Custom deployment tasks (`tasks/deploy.ts`).

## 7. Security Analysis

Added static analysis and linting tooling:

```bash
pnpm add -D solhint
```

- **Slither**: Configured in `slither.config.json` with all detectors enabled and OpenZeppelin remappings.
- **Solhint**: Configured in `.solhint.json` with `solhint:recommended` plus strict rules for visibility, naming, and unused imports.
- **SECURITY.md**: Added security policy with vulnerability disclosure process and tooling overview.

## 8. Foundry Integration

Set up Foundry alongside Hardhat for advanced testing capabilities:

- **Config**: `foundry.toml` with remappings to `node_modules`, optimizer settings, and fuzz/invariant run parameters.
- **Fuzz Tests**: `test/foundry/Counter.fuzz.t.sol` — property-based tests (1000 runs) covering increment correctness, monotonicity, event emission, re-initialization prevention, and admin-only upgrades.
- **Invariant Tests**: `test/foundry/Counter.invariant.t.sol` — handler-based invariant tests (256 runs, depth 50) verifying `x == callCount` across random call sequences.
- **Upgrade Safety Tests**: `test/foundry/UpgradeSafety.t.sol` — state preservation, storage layout compatibility, re-initialization prevention, and double upgrade prevention.

## 9. Formal Verification

Added SMTChecker profile in `hardhat.config.ts`:

- **Profile**: `smt` — uses CHC engine targeting `assert`, `underflow`, `overflow`, and `divByZero`.
- **Usage**: `hardhat compile --profile smt`

## 10. NatSpec Documentation

Added comprehensive NatSpec comments to all contracts:

- `Counter.sol`: `@title`, `@notice`, `@dev`, `@param` on all functions, events, and state variables.
- `CounterV2.sol`: Same coverage plus `@custom:storage-location` annotation documenting upgrade-safe storage layout.

## 11. Internal Audit Checklist

Created `docs/INTERNAL_AUDIT_CHECKLIST.md` — a 10-section pre-deployment checklist covering:

- Pre-audit setup, static analysis, testing thresholds (≥95% line coverage, ≥90% branch coverage)
- Common vulnerability checks (reentrancy, access control, integer arithmetic, external calls, DoS, front-running)
- Upgrade safety, formal verification, gas optimization
- Deployment & verification, operational security, documentation & compliance
- Sign-off table and tool commands quick reference

## 12. NPM Scripts

Added scripts to `package.json`:

```json
{
  "build": "hardhat compile",
  "test": "hardhat test",
  "test:forge": "forge test -vvv",
  "test:fuzz": "forge test --match-path 'test/foundry/*.fuzz.t.sol' -vvv",
  "test:invariant": "forge test --match-path 'test/foundry/*.invariant.t.sol' -vvv",
  "coverage:forge": "forge coverage",
  "gas:forge": "forge test --gas-report",
  "lint:sol": "solhint 'contracts/**/*.sol'",
  "security:slither": "slither . --config-file slither.config.json",
  "security:all": "pnpm run security:slither && pnpm run test:fuzz && pnpm run test:invariant",
  "verify": "hardhat verify"
}
```
