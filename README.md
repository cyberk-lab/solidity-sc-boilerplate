What I do:
1. Init a new hardhat project
```bash
pnpm dlx hardhat --init
```
With below options:
  - hardhat-3
  - node-test-runner-viem

2. Install openzeppelin contracts
```bash
pnpm add -D @openzeppelin/contracts @openzeppelin/contracts-upgradeable
```

3. Configure Network Credentials
- For ignore mistake, each contract project should have difference PK, so rename in hardhat.config.ts, rename `SEPOLIA_PRIVATE_KEY` to `BOILERPLATE_SEPOLIA_PRIVATE_KEY`
- Configure SEPOLIA_RPC_URL and BOILERPLATE_SEPOLIA_PRIVATE_KEY in keystore

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set BOILERPLATE_SEPOLIA_PRIVATE_KEY
```

4. Plugins:
- hardhat-network-helpers
- hardhat-viem-assertions
- custom plugins (/plugins/*)
```bash
pnpm add -D @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-viem-assertions
```