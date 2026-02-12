# Discovery: Integrate Minter into StableCoinSystem

## 1. Feature Summary
Integrate the already-implemented `Minter` contract into the `StableCoinSystemModule` Ignition deployment, supporting both fresh deploy and upgrade of existing StableToken/StakingVault deployments. Minter needs `MINTER_ROLE` on StableToken to mint/burn.

## 2. Architecture Snapshot

### Relevant Packages
| Package                              | Purpose                       | Key Files                                |
| ------------------------------------ | ----------------------------- | ---------------------------------------- |
| `contracts/`                         | Solidity sources              | `Minter.sol`, `StableToken.sol`          |
| `ignition/modules/`                  | Declarative deployment        | `StableCoinSystem.ts`, `Minter.ts`, `StableToken.ts`, `StakingVault.ts`, `Upgrade.ts` |
| `tasks/`                             | Hardhat CLI tasks             | `deploy.ts`, `CONFIG.ts`                 |

### Entry Points
- Deploy: `npx hardhat deploy --network sepolia` → `tasks/deploy.ts` → `StableCoinSystemModule`
- Ignition modules: `StableCoinSystemModule` composes `StableTokenModule` + `StakingVaultModule`

## 3. Existing Patterns

### Similar Implementations
| Feature                 | Location                          | Pattern Used                                      |
| ----------------------- | --------------------------------- | ------------------------------------------------- |
| StableToken deploy      | `ignition/modules/StableToken.ts` | impl + ERC1967Proxy + initialize                  |
| StakingVault deploy     | `ignition/modules/StakingVault.ts`| impl + ERC1967Proxy + initialize via useModule     |
| Minter standalone       | `ignition/modules/Minter.ts`     | impl + ERC1967Proxy + initialize (uses StableTokenModule) |
| Upgrade pattern         | `ignition/modules/Upgrade.ts`    | `upgradeToAndCall` on existing proxy              |
| System composition      | `ignition/modules/StableCoinSystem.ts` | `m.useModule()` to compose sub-modules       |

### Reusable Utilities
- `Minter.ts` module already deploys Minter with proxy – can be composed via `m.useModule()`
- `Upgrade.ts` shows the `upgradeToAndCall` pattern for UUPS upgrades
- StableToken has `MINTER_ROLE` (keccak256("MINTER_ROLE")) and `grantRole` via AccessControl

## 4. Technical Constraints
- StableToken and StakingVault are already deployed on Sepolia – need upgrade support, not re-deploy
- Minter requires `MINTER_ROLE` on StableToken to call `mint()` and `burn()`
- Minter.initialize needs `treasuryVault` param – must be added to CONFIG
- Ignition modules are idempotent; `m.useModule()` reuses existing contract futures

## 5. External References
- Hardhat Ignition docs: modules, parameters, upgradeToAndCall pattern
- OpenZeppelin AccessControl: `grantRole(MINTER_ROLE, minter)`

## 6. Gap Analysis
| Component             | Have                              | Need                                          | Gap Size |
| --------------------- | --------------------------------- | --------------------------------------------- | -------- |
| Minter module         | Standalone `Minter.ts`            | Composed in `StableCoinSystemModule`           | Small    |
| MINTER_ROLE grant     | None                              | `grantRole(MINTER_ROLE, minter)` in system module | New  |
| CONFIG treasuryVault  | Missing                           | `treasuryVault` address in sepolia config      | New      |
| Deploy task params    | admin, dailyRewardCapBps, redemptionDelay | + treasuryVault for MinterModule          | Small    |

## 7. Tracks Used
- **Architecture Snapshot**: ✅ Read all relevant modules, contracts, tasks, specs
- **Internal Patterns**: ✅ Analyzed Upgrade.ts and existing module composition pattern
- **External Patterns**: Skipped – patterns already established in codebase
- **Constraint Check**: ✅ Reviewed CONFIG.ts for missing parameters
- **Documentation**: Skipped – Hardhat Ignition patterns already used in project
