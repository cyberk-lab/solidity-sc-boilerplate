# stablecoin-system-module Specification

## Purpose
TBD - created by archiving change create-stablecoin-deploy-module. Update Purpose after archive.
## Requirements
### Requirement: Composite StableCoinSystem Ignition Module

The system SHALL provide an Ignition module `StableCoinSystemModule` at `ignition/modules/StableCoinSystem.ts` that composes `StableTokenModule` and `StakingVaultModule` using `m.useModule()`, deploying both contracts in a single `ignition.deploy()` call.

The module SHALL pass the deployed StableToken proxy address to StakingVaultModule automatically via its `stableToken` parameter.

The module SHALL return both `stableToken` and `vault` contract references.

#### Scenario: Full system deployment

- **WHEN** `ignition.deploy(StableCoinSystemModule, { parameters })` is called with `admin`, `rewardRecipient`, and `dailyRewardCapBps`
- **THEN** StableToken is deployed first (impl + proxy + initialize)
- **AND** StakingVault is deployed next using the StableToken proxy address
- **AND** the returned object contains `{ stableToken, vault }`

### Requirement: Updated Deploy Task

The deploy task SHALL invoke `StableCoinSystemModule` instead of `CounterModule`, forwarding `admin`, `rewardRecipient`, `dailyRewardCapBps`, and optional `redemptionDelay` from config.

#### Scenario: Deploy via CLI

- **WHEN** `npx hardhat deploy --network sepolia` is executed
- **THEN** the task reads config from `getConfig(network)`
- **AND** deploys StableCoinSystemModule with the config parameters

### Requirement: StakingVault Module Accepts StableToken via useModule

The existing `StakingVaultModule` SHALL be modified so that when composed via `m.useModule()`, it receives the `stableToken` address from the parent module rather than requiring it as a standalone parameter.

#### Scenario: Composed deployment

- **WHEN** StakingVaultModule is used inside StableCoinSystemModule
- **THEN** the `stableToken` parameter is resolved from the StableToken proxy address provided by the parent

