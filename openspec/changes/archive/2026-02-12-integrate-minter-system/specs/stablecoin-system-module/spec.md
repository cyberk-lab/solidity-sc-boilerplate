## MODIFIED Requirements

### Requirement: Composite StableCoinSystem Ignition Module

The system SHALL provide an Ignition module `StableCoinSystemModule` at `ignition/modules/StableCoinSystem.ts` that composes `StableTokenModule`, `StakingVaultModule`, and `MinterModule` using `m.useModule()`, deploying all three contracts in a single `ignition.deploy()` call.

The module SHALL pass the deployed StableToken proxy address to StakingVaultModule and MinterModule automatically via `m.useModule()`.

The module SHALL grant `MINTER_ROLE` to the Minter contract on StableToken after deployment.

The module SHALL return `stableToken`, `vault`, and `minter` contract references.

#### Scenario: Full system deployment with Minter

- **WHEN** `ignition.deploy(StableCoinSystemModule, { parameters })` is called with `admin`, `dailyRewardCapBps`, `treasuryVault`
- **THEN** StableToken is deployed (impl + proxy + initialize)
- **AND** StakingVault is deployed using the StableToken proxy address
- **AND** Minter is deployed using the StableToken proxy address and `treasuryVault`
- **AND** `setRewardRecipient(vault)` is called on StableToken
- **AND** `grantRole(MINTER_ROLE, minter)` is called on StableToken
- **AND** the returned object contains `{ stableToken, vault, minter }`

### Requirement: Updated Deploy Task

The deploy task SHALL invoke `StableCoinSystemModule` instead of `CounterModule`, forwarding `admin`, `dailyRewardCapBps`, optional `redemptionDelay`, and `treasuryVault` from config.

#### Scenario: Deploy via CLI

- **WHEN** `npx hardhat deploy --network sepolia` is executed
- **THEN** the task reads config from `getConfig(network)`
- **AND** deploys StableCoinSystemModule with the config parameters including `treasuryVault`

## ADDED Requirements

### Requirement: Deploy Config Includes treasuryVault

The deploy config in `tasks/CONFIG.ts` SHALL include a `treasuryVault` address and `collateralTokens` array for each network.

#### Scenario: Config for sepolia

- **WHEN** `getConfig('sepolia')` is called
- **THEN** it returns an object with `admin`, `dailyRewardCapBps`, `redemptionDelay`, `treasuryVault`, and `collateralTokens`

