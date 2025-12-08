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
