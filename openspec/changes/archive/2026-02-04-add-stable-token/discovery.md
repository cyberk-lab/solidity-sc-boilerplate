# Discovery: StableToken

## 1. Feature Summary
Add an upgradeable ERC20 stablecoin contract (StableToken) with ERC20Permit support, MINTER_ROLE for minting, and AccessControlDefaultAdminRules (1-day delay) following the existing UUPS proxy pattern.

## 2. Architecture Snapshot

### Relevant Packages
| Package | Purpose | Key Files |
| --- | --- | --- |
| `contracts/` | Solidity sources | `Counter.sol`, `CounterV2.sol` |
| `ignition/modules/` | Deployment modules | `Counter.ts` (UUPS proxy deploy pattern) |
| `test/` | Hardhat TS tests | `Counter.ts`, `fixture.ts` |
| `shared/` | TS utils/constants | `constants.ts`, `utils.ts` |
| `@openzeppelin/contracts-upgradeable` | OZ upgradeable base | `ERC20Upgradeable`, `ERC20PermitUpgradeable`, `AccessControlDefaultAdminRulesUpgradeable`, `UUPSUpgradeable` |

### Entry Points
- Contract: `contracts/StableToken.sol`
- Ignition: `ignition/modules/StableToken.ts`
- Test: `test/StableToken.ts`, `test/fixture.ts`

## 3. Existing Patterns

### Similar Implementations
| Feature | Location | Pattern Used |
| --- | --- | --- |
| Counter (upgradeable + access control) | `contracts/Counter.sol` | UUPS + AccessControlDefaultAdminRules + `_disableInitializers()` |
| Ignition proxy deploy | `ignition/modules/Counter.ts` | `buildModule` → impl contract + `ERC1967Proxy` with encoded `initialize` call |
| Test fixture | `test/fixture.ts` | `createXxxFixture(connection)` returning contract + wallets + viem |
| Test assertions | `test/Counter.ts` | `viem.assertions.emitWithArgs`, `revertWithCustomError`, `node:test` describe/it |

### Reusable Utilities
- `shared/utils.ts`: `extractEvent`, `extractEvents` for transaction receipt parsing
- `shared/constants.ts`: event name constants
- `tasks/deploy.ts`: `runDeployTask` pattern for ignition deploy with params

## 4. Technical Constraints
- Dependencies: `@openzeppelin/contracts-upgradeable` v5.4.0 already installed — includes `ERC20Upgradeable`, `ERC20PermitUpgradeable`
- Solidity ^0.8.28, Hardhat v3, viem ^2.30.0
- Must use `_disableInitializers()` in constructor
- Storage layout must be append-only for future upgrades

## 5. External References
- OpenZeppelin ERC20Upgradeable: `@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol`
- OpenZeppelin ERC20PermitUpgradeable: `@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol`

## 6. Gap Analysis (Synthesized)
| Component | Have | Need | Gap Size |
| --- | --- | --- | --- |
| ERC20 contract | None | StableToken.sol with ERC20+Permit+UUPS+AccessControl | New |
| Ignition module | Counter.ts pattern | StableToken.ts module | New (small, follows pattern) |
| Test fixture | `createCounterFixture` pattern | `createStableTokenFixture` | New (small, follows pattern) |
| Hardhat tests | Counter.ts test structure | StableToken tests (init, mint, transfer, permit, upgrade) | New |

## 7. Tracks Used
- **Architecture Snapshot**: Read all affected files (contracts, tests, ignition, shared)
- **Internal Patterns**: Analyzed Counter.sol, fixture.ts, Counter.ts test patterns
- **Constraint Check**: Verified OZ v5.4.0 has required ERC20Permit contracts
- _External Patterns_: Skipped — standard OZ pattern, well-documented
- _Documentation_: Skipped — OZ contracts are familiar, no new external API
