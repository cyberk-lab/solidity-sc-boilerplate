import { NetworkConnection } from 'hardhat/types/network';
import { runDeployTask } from '../tasks/deploy.js';
import UpgradeModule from '../ignition/modules/Upgrade.js';

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

export const deployImplementation = async (connection: NetworkConnection) => {
  const { viem } = connection;

  const counterImpl = await viem.deployContract('Counter');
  const counterV2Impl = await viem.deployContract('CounterV2');

  return { counterImpl, counterV2Impl, viem };
};
