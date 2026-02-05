# Solidity Smart Contract Boilerplate

A modern Hardhat-based boilerplate for Solidity smart contract development, featuring upgrading proxy patterns, Viem integration, and optimized testing workflows.

## Features

- **Hardhat**: Development environment.
- **Viem**: Lightweight and type-safe Ethereum library for testing and interaction.
- **OpenZeppelin Contracts**: Standard secure smart contracts (Upgradeable).
- **Hardhat Ignition**: Declarative deployment system.
- **Prettier**: Automatic code formatting for Solidity and TypeScript.
- **Custom Plugins**: Enhanced testing assertions and network helpers.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

## Installation

1.  Clone the repository:

    ```bash
    git clone <repo-url>
    cd solidity-sc-boilerplate
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

## Configuration

Set up your environment variables using Hardhat's configuration manager or `.env` file (if applicable).

To set keys using Hardhat's keystore:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set BOILERPLATE_SEPOLIA_PRIVATE_KEY
```

## Usage

### Compile

Compile the smart contracts:

```bash
npx hardhat compile
```

### Test

Run the test suite:

```bash
npx hardhat test
```

### Format

Format code using Prettier:

```bash
npx hardhat format
# or
pnpm exec prettier --write .
```

### Deploy

Deploy contracts using Hardhat Ignition:

```bash
npx hardhat ignition deploy ignition/modules/Counter.ts --network <network_name>
```

## Contracts

### StakingVault

A staking vault where users deposit stabletoken and receive share tokens (sSTBL). Share price increases when anyone transfers stabletoken directly to the vault (donation). Redemptions require a configurable cooldown period.

**Key features:**

- **Deposit**: `deposit(uint256 assets)` — deposits stabletoken, mints sSTBL shares at current exchange rate
- **Share price appreciation**: `totalAssets() / totalSupply()` — price increases with direct transfers to vault
- **Delayed redemption**: `requestRedeem(shares)` → wait `redemptionDelay` → `completeRedeem()`
- **Cancel redemption**: `cancelRedeem()` — unlocks shares if user changes their mind
- **Inflation protection**: Virtual offset + minimum first deposit

**Deploy:**

```bash
npx hardhat ignition deploy ignition/modules/StakingVault.ts --network <network> \
  --parameters '{"StakingVaultModule": {"admin": "0x...", "stableToken": "0x..."}}'
```

## Project Structure

- `contracts/`: Solidity smart contracts.
- `test/`: Tests using Hardhat Runner and Viem.
- `test/foundry/`: Foundry fuzz and invariant tests.
- `ignition/`: Deployment modules.
- `tasks/`: Custom Hardhat tasks.
- `plugins/`: Custom Hardhat plugins.
- `shared/`: Shared utilities and constants.

## Scaffolding

For details on how this boilerplate was constructed, see [SCAFFOLDING.md](./SCAFFOLDING.md).

## License

[MIT](LICENSE)
