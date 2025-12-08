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

## Project Structure

- `contracts/`: Solidity smart contracts.
- `test/`: Tests using Hardhat Runner and Viem.
- `ignition/`: Deployment modules.
- `tasks/`: Custom Hardhat tasks.
- `plugins/`: Custom Hardhat plugins.
- `shared/`: Shared utilities and constants.

## Scaffolding

For details on how this boilerplate was constructed, see [SCAFFOLDING.md](./SCAFFOLDING.md).

## License

[MIT](LICENSE)
