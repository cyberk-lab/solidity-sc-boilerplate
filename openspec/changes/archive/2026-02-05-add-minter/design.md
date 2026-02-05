# Design: Minter Contract

## Goals / Non-Goals
- **Goals**: Upgradeable Minter (UUPS + AccessControl) for deposit/mint and redeem/burn of stableToken against whitelisted stable USD collateral; correct decimal conversion; reentrancy-safe external token interactions via SafeERC20
- **Non-Goals**: Price oracle / variable exchange rate (fixed 1:1 USD peg); pausability (defer to future upgrade); fee mechanism; separate vault contract; permit-based deposit flow

## Architecture

### Contract Inheritance
```
Minter is AccessControlDefaultAdminRulesUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable
```

### Deposit Flow
1. User calls `deposit(collateralToken, amount)` — `amount` in collateral's native decimals (e.g., 6 for USDC)
2. Minter transfers `amount` collateral from user → `treasuryVault` via `safeTransferFrom`
3. Minter computes `mintAmount = amount * 10^(18 - collateralDecimals)`
4. Minter calls `stableToken.mint(user, mintAmount)`

### Redeem Flow
1. User calls `redeem(collateralToken, tokenAmount)` — `tokenAmount` in stableToken's 18 decimals
2. Minter computes `collateralAmount = tokenAmount / 10^(18 - collateralDecimals)`
3. Validates `tokenAmount % scalingFactor == 0` (no dust loss)
4. Burns stableToken from user (role-based, no user approval needed)
5. Transfers collateral from Minter (redeem vault) → user

### Storage Layout
```solidity
IStableToken public stableToken;                             // slot n
address public treasuryVault;                                // slot n+1
EnumerableSet.AddressSet private _collateralTokens;          // slot n+2, n+3
mapping(address => uint8) private _collateralDecimals;       // slot n+4
uint256[45] private __gap;                                   // upgrade safety
```

## Gap Analysis

| Component | Have | Need | Gap |
| --- | --- | --- | --- |
| StableToken (ERC20) | `StableToken.sol` with `mint` + MINTER_ROLE | Also need `burn(address, uint256)` callable by MINTER_ROLE | **Small mod** |
| Minter contract | Nothing | Full contract with deposit/redeem/admin | **New** |
| Collateral whitelist | Nothing | EnumerableSet + decimals cache | **New** (in Minter) |
| Treasury vault | Nothing | Address config (admin-mutable) | **New** (in Minter) |
| Redeem vault | Nothing | Minter holds collateral; admin deposits/withdraws | **New** (in Minter) |
| Mock ERC20 | `contracts/mock/` dir exists | MockERC20 with configurable decimals | **New** |
| Deployment module | Nothing | Ignition module for Minter | **New** |
| Tests | StableToken test pattern | Minter test suite | **New** |

## Decisions

### 1. StableToken needs `burn` function
Add `burn(address from, uint256 amount) external onlyRole(MINTER_ROLE)` to StableToken. Role-restricted burn (same pattern as mint) — no user approval step, single-tx redeem. NOT using ERC20BurnableUpgradeable (exposes public burn to all holders — unnecessary scope).

### 2. Cache collateral decimals at whitelist time
Store `mapping(address => uint8) _collateralDecimals` populated in `addCollateralToken` by reading `IERC20Metadata(token).decimals()`. Avoids repeated external calls, prevents manipulation by malicious token changing `decimals()`. Clear on `removeCollateralToken` for gas refund.

### 3. Decimal conversion with exact divisibility on redeem
Scaling factor = `10^(18 - collateralDecimals)`. On redeem, require `tokenAmount % scalingFactor == 0` to prevent silent dust loss. Validate `decimals <= 18` in `addCollateralToken`.

### 4. Redeem vault = Minter's own token balances
No separate vault contract. `getRedeemVaultBalance(token)` returns `IERC20(token).balanceOf(address(this))`. Simplest approach.

### 5. Admin withdrawal from redeem vault
Add `withdrawFromRedeemVault(address token, uint256 amount, address to)` — does NOT require token to be whitelisted (enables recovery of delisted tokens or accidentally sent tokens).

### 6. Prevent stableToken as collateral
`addCollateralToken` checks `token != address(stableToken)` to prevent circular mint/burn loop.

### 7. IStableToken interface
```solidity
interface IStableToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}
```
Keeps dependency explicit and minimal.

## Risk Map

| Component | Risk Level | Reason | Verification |
| --- | --- | --- | --- |
| UUPS + AccessControl | LOW | Exact pattern from Counter.sol | Unit test |
| SafeERC20 transfers | LOW | OZ battle-tested | Test with mock |
| Decimal conversion | MEDIUM | Off-by-one = 10^12x error | Fuzz test with varying decimals (6, 8, 18) |
| Reentrancy on redeem | LOW | `nonReentrant` + burn-before-transfer (CEI) | Test with reentrancy mock |
| StableToken burn dep | MEDIUM | Must add `burn` to StableToken | Integration test; deploy sequence |
| Storage layout | LOW | OZ v5 namespaced storage; `__gap` | OZ upgrades plugin check |

## Migration Plan
1. Add `burn` function to StableToken (upgrade or redeploy)
2. Deploy Minter implementation + proxy with `initialize(stableToken, admin, treasuryVault)`
3. Grant MINTER_ROLE on StableToken to Minter proxy
4. Add collateral tokens via `addCollateralToken`
5. Fund redeem vault via `depositToRedeemVault`
6. **Rollback**: Revoke MINTER_ROLE from Minter → Minter becomes inert; admin withdraws redeem vault funds

## Open Questions
- [x] Should `depositToRedeemVault` require token to be whitelisted? (Answer: yes)
- [x] Should Pausable be included? (Answer: defer to future upgrade)
- [x] Should `withdrawFromRedeemVault` require token to be whitelisted? (Answer: no — enables recovery)
