import { NetworkConnection } from 'hardhat/types/network';
import { runDeployTask } from '../tasks/deploy.js';
import UpgradeModule from '../ignition/modules/Upgrade.js';
import StableTokenModule from '../ignition/modules/StableToken.js';
import { encodeFunctionData, keccak256, toHex } from 'viem';

export const createCounterFixture = async (connection: NetworkConnection) => {
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();

  const [admin, ...users] = await viem.getWalletClients();

  const { counter } = await runDeployTask({ admin: admin.account.address }, connection);

  return { counter, admin, users, publicClient, viem };
};

export const createUpgradeFixture = async (connection: NetworkConnection) => {
  const { ignition, viem } = connection;

  const [admin, ...users] = await viem.getWalletClients();

  const { counter } = await ignition.deploy(UpgradeModule, {
    parameters: {
      CounterModule: {
        admin: admin.account.address,
      },
      UpgradeModule: {
        incrementer: users[0].account.address,
      },
    },
  });

  return { counter, admin, users, viem };
};

export const createStableTokenFixture = async (connection: NetworkConnection) => {
  const { ignition, viem } = connection;
  const publicClient = await viem.getPublicClient();

  const [admin, minter, rewardRecipient, ...users] = await viem.getWalletClients();

  const { stableToken } = await ignition.deploy(StableTokenModule, {
    parameters: {
      StableTokenModule: {
        admin: admin.account.address,
        rewardRecipient: rewardRecipient.account.address,
        dailyRewardCapBps: 100n,
      },
    },
  });

  return { stableToken, admin, minter, rewardRecipient, users, publicClient, viem };
};

export const createMinterFixture = async (connection: NetworkConnection) => {
  const { ignition, viem } = connection;
  const publicClient = await viem.getPublicClient();

  const [admin, treasuryVault, rewardRecipient, ...users] = await viem.getWalletClients();

  const { stableToken } = await ignition.deploy(StableTokenModule, {
    parameters: {
      StableTokenModule: {
        admin: admin.account.address,
        rewardRecipient: rewardRecipient.account.address,
        dailyRewardCapBps: 100n,
      },
    },
  });

  const usdc = await viem.deployContract('MockERC20', ['USD Coin', 'USDC', 6]);
  const usdt = await viem.deployContract('MockERC20', ['Tether USD', 'USDT', 6]);

  const minterImpl = await viem.deployContract('Minter');
  const initData = encodeFunctionData({
    abi: minterImpl.abi,
    functionName: 'initialize',
    args: [stableToken.address, admin.account.address, treasuryVault.account.address],
  });
  const minterProxy = await viem.deployContract('ERC1967Proxy', [minterImpl.address, initData]);
  const minter = await viem.getContractAt('Minter', minterProxy.address);

  const MINTER_ROLE = keccak256(toHex('MINTER_ROLE'));
  await stableToken.write.grantRole([MINTER_ROLE, minter.address], { account: admin.account });

  await minter.write.addCollateralToken([usdc.address], { account: admin.account });
  await minter.write.addCollateralToken([usdt.address], { account: admin.account });

  return { minter, stableToken, usdc, usdt, admin, treasuryVault, users, publicClient, viem };
};

export const createStakingVaultFixture = async (connection: NetworkConnection) => {
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [admin, ...users] = await viem.getWalletClients();

  const stableToken = await viem.deployContract('MockERC20', ['StableToken', 'STBL', 18]);

  const vaultImpl = await viem.deployContract('StakingVault');
  const SEVEN_DAYS = 7n * 24n * 60n * 60n;
  const initData = encodeFunctionData({
    abi: vaultImpl.abi,
    functionName: 'initialize',
    args: [stableToken.address, admin.account.address, SEVEN_DAYS],
  });
  const vaultProxy = await viem.deployContract('ERC1967Proxy', [vaultImpl.address, initData]);
  const vault = await viem.getContractAt('StakingVault', vaultProxy.address);

  return { vault, stableToken, admin, users, publicClient, viem };
};

export const deployImplementation = async (connection: NetworkConnection) => {
  const { viem } = connection;

  const counterImpl = await viem.deployContract('Counter');
  const counterV2Impl = await viem.deployContract('CounterV2');

  return { counterImpl, counterV2Impl, viem };
};
