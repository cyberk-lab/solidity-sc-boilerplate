# Design: StableToken

## Goals / Non-Goals
- **Goals**: Upgradeable ERC20 with permit, role-based minting, UUPS proxy, full test coverage, ignition deployment
- **Non-Goals**: Burn, pause, blacklist, cap, initial supply minting, custom decimals (all can be added later via upgrade)

## Architecture

### Contract Inheritance
```
ERC20Upgradeable
  └─ ERC20PermitUpgradeable
       └─ AccessControlDefaultAdminRulesUpgradeable
            └─ UUPSUpgradeable
                 └─ StableToken
```

### Deployment Flow
```
StableToken (impl) ──► ERC1967Proxy(impl, initialize(admin)) ──► StableToken proxy
```

## Gap Analysis

| Component | Have | Need | Gap |
| --- | --- | --- | --- |
| Contract | Counter.sol pattern | StableToken.sol (ERC20+Permit+AccessControl+UUPS) | New file, follows pattern |
| Ignition | Counter.ts module | StableToken.ts module | New file, copy+adapt |
| Fixture | createCounterFixture | createStableTokenFixture | New function |
| Tests | Counter.ts | StableToken.ts (init, mint, transfer, upgrade) | New file |

## Decisions

### Inheritance Order: ERC20 → ERC20Permit → AccessControlDefaultAdminRules → UUPS
ERC20Permit extends ERC20, so it must come after. AccessControl and UUPS are independent but follow the Counter.sol convention of AccessControl before UUPS.

### 18 Decimals (default)
Keep default 18 decimals. If 6 is needed later (USDC-style), override `decimals()` in a V2 upgrade.

### Zero Initial Supply
Stablecoins should mint on-demand via MINTER_ROLE, not pre-mint in initialize. This follows least-privilege principle.

### Admin Does NOT Get MINTER_ROLE
Separation of concerns — admin manages roles, minter mints. Grant MINTER_ROLE explicitly post-deployment.

### ERC20Permit Name Matches Token Name
`__ERC20Permit_init("StableToken")` must use the same string as `__ERC20_init("StableToken", "STBL")` for correct EIP-712 domain.

## Risk Map

| Component | Risk Level | Reason | Verification |
| --- | --- | --- | --- |
| Contract | LOW | Standard OZ pattern, same as Counter.sol | Compile + test |
| Ignition module | LOW | Direct copy of Counter.ts pattern | Deploy in test |
| Permit test | MEDIUM | EIP-712 signing requires constructing domain + types in viem | Manual test verification |
| Upgrade | LOW | Same pattern as Counter.sol | Existing test pattern |

## Open Questions
- [ ] Should decimals be 6 (USDC-style) or 18 (default)? — defaulting to 18 for now
