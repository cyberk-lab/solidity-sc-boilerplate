---
name: verifying-contracts
description: "Verifies deployed Solidity contracts on Etherscan. Use when asked to verify contracts, fix verification errors, or after deploying to a live network."
---

# Verifying Contracts on Etherscan

Guide for verifying Hardhat v3 + Ignition deployed contracts on Etherscan-compatible explorers.

## Prerequisites

- `verify.etherscan.apiKey` configured in `hardhat.config.ts` via `configVariable('ETHERSCAN_API_KEY')`
- Successful deployment with Ignition (deployment artifacts in `ignition/deployments/chain-<chainId>/`)

## Workflow

### 1. Identify deployed contracts

Read `ignition/deployments/chain-<chainId>/deployed_addresses.json` to get all contract addresses and their IDs.

Typical UUPS proxy deployment produces:
- `*Impl` — implementation contract (no constructor args)
- `*Proxy` — ERC1967Proxy contract (has constructor args)
- Named contract — `contractAt` pointing to proxy address

### 2. Verify implementation contracts (no constructor args)

```bash
npx hardhat verify --build-profile default \
  --contract contracts/<ContractName>.sol:<ContractName> \
  <IMPL_ADDRESS> \
  --network <network>
```

Key: always pass `--build-profile default` (or whichever profile was used during deployment) to avoid bytecode mismatch.

### 3. Verify proxy contracts (with constructor args)

#### 3a. Extract constructor args from Ignition journal

```bash
cat ignition/deployments/chain-<chainId>/journal.jsonl | python3 -c "
import json, sys
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
    except:
        continue
    s = json.dumps(d)
    if 'Proxy' in s and 'constructorArgs' in s:
        print(json.dumps(d, indent=2)[:600])
        print('---')
"
```

#### 3b. Create constructor args file

Create a `.cjs` file (NOT `.js` — project uses `"type": "module"`):

```js
// verify-args-<name>-proxy.cjs
module.exports = [
  "<IMPLEMENTATION_ADDRESS>",
  "<ENCODED_INITIALIZE_CALLDATA>",
];
```

#### 3c. Run verify

```bash
npx hardhat verify --build-profile default \
  --contract @openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
  --constructor-args-path verify-args-<name>-proxy.cjs \
  <PROXY_ADDRESS> \
  --network <network>
```

### 4. Cleanup

Delete temporary `verify-args-*.cjs` files after successful verification.

## Common Errors

### `HHE80024` — Bytecode mismatch

**Cause:** `ignition verify` or `hardhat verify` uses wrong compiler settings (optimizer, evmVersion).

**Fix:** Use `--build-profile <profile>` matching the profile used during deployment. Check build-info files in `ignition/deployments/chain-<chainId>/build-info/` to confirm settings:

```bash
python3 -c "
import json, glob
for f in glob.glob('ignition/deployments/chain-*/build-info/*.json'):
    d = json.load(open(f))
    s = d.get('input',{}).get('settings',{})
    print(f, 'optimizer:', s.get('optimizer',{}), 'evmVersion:', s.get('evmVersion',''))
"
```

### `HHE80105` — ES module error for constructor args file

**Cause:** Project has `"type": "module"` in `package.json`, so `.js` files are ESM.

**Fix:** Use `.cjs` extension for constructor args files.

### `ignition verify` fails but `hardhat verify` works

`hardhat ignition verify` may not pass the correct build profile. Use `hardhat verify` directly with `--build-profile` instead.

## Quick Reference

| Contract Type      | Constructor Args? | `--contract` flag                                    |
| :----------------- | :---------------- | :--------------------------------------------------- |
| Implementation     | None              | `contracts/X.sol:X`                                  |
| ERC1967Proxy       | (impl, initData)  | `@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy` |
| UpgradeableBeacon  | (impl, owner)     | `@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol:UpgradeableBeacon` |
