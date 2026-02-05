# Discovery: Minter Contract

## 1. Feature Summary
An upgradeable Minter contract that allows users to deposit whitelisted stable USD collateral tokens to mint stableToken, and redeem stableToken for collateral. Admin manages collateral whitelist, treasury vault, and redeem vault liquidity.

## 2. Architecture Snapshot

### Relevant Packages
| Package | Purpose | Key Files |
| --- | --- | --- |
| `contracts/` | Solidity sources | `StableToken.sol`, `Counter.sol` (UUPS pattern reference) |
| `test/` | Hardhat tests (TS) | `StableToken.ts`, `fixture.ts` |
| `ignition/modules/` | Deployment modules | `StableToken.ts`, `Counter.ts` |
| `shared/` | TS utils/constants | `constants.ts`, `utils.ts` |
| `@openzeppelin/contracts-upgradeable` | Base contracts | AccessControl, UUPS, ERC20, ReentrancyGuard, Pausable |

### Entry Points
- User: `deposit(collateralToken, amount)` → mint stableToken
- User: `redeem(collateralToken, tokenAmount)` → burn stableToken, receive collateral
- Admin: `setTreasuryVault(address)`, `addCollateralToken(address)`, `removeCollateralToken(address)`, `depositToRedeemVault(token, amount)`

## 3. Existing Patterns

### Similar Implementations
| Feature | Location | Pattern Used |
| --- | --- | --- |
| UUPS + AccessControl | `Counter.sol` | `AccessControlDefaultAdminRulesUpgradeable` + `UUPSUpgradeable` |
| ERC20 + MINTER_ROLE | `StableToken.sol` | Role-based mint/burn, `_disableInitializers()`, `initializer` |
| Test fixtures | `test/fixture.ts` | `createXxxFixture(connection)` pattern with viem |
| Ignition modules | `ignition/modules/` | Declarative deployment with parameters |

### Reusable Utilities
- `shared/utils.ts`: `extractEvent()` / `extractEvents()` for test event parsing
- `shared/constants.ts`: Shared constant definitions
- `viem.assertions`: `emitWithArgs`, `revertWithCustomError`

## 4. Technical Constraints
- OpenZeppelin upgradeable contracts available: `ReentrancyGuardUpgradeable`, `PausableUpgradeable`, `AccessControlDefaultAdminRulesUpgradeable`, `UUPSUpgradeable`
- OZ `EnumerableSet` available at `@openzeppelin/contracts/utils/structs/EnumerableSet.sol` (non-upgradeable, but safe for storage)
- StableToken has `MINTER_ROLE` — Minter contract needs this role to mint/burn
- Collateral tokens are external ERC20s (USDC, USDT, etc.) — must use `SafeERC20` for transfers
- UUPS: `_disableInitializers()` in constructor, `reinitializer(N)` for upgrades

## 5. External References
- OpenZeppelin UUPS pattern: well-established in codebase
- SafeERC20: `@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol` for safe external token transfers
- IERC20: `@openzeppelin/contracts/token/ERC20/IERC20.sol`

## 6. Gap Analysis
| Component | Have | Need | Gap Size |
| --- | --- | --- | --- |
| StableToken | StableToken with MINTER_ROLE (mint only) | Also need `burn` function | **Small mod** |
| Minter contract | None | Full Minter contract | **New** |
| Collateral whitelist | None | EnumerableSet of allowed tokens | **New** |
| Treasury vault | None | Address config for collateral destination | **New** |
| Redeem vault | None | Minter holds redeem liquidity, admin deposits | **New** |
| Deployment module | None | Ignition module for Minter | **New** |
| Tests | StableToken test pattern | Minter Hardhat + Foundry tests | **New** |
| Mock ERC20 | `contracts/mock/` dir exists | Mock USDC/USDT for testing | **New** |

## 7. Tracks Used
- **Architecture Snapshot**: ✅ Read all contracts, tests, fixtures, ignition modules
- **Internal Patterns**: ✅ Analyzed UUPS + AccessControl patterns, test fixture patterns
- **Constraint Check**: ✅ Checked available OZ contracts in node_modules
- **External Patterns**: Skipped — vault/minter pattern is well-understood
- **Documentation**: Skipped — all deps are OZ, already in use
