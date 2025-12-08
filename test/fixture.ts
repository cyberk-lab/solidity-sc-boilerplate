import { NetworkConnection } from 'hardhat/types/network';
import { runDeployTask } from '../tasks/deploy.js';
import UpgradeModule from '../ignition/modules/Upgrade.js';

export const createCouterFixture = async (connection: NetworkConnection) => {
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
    },
  });

  return { counter, admin, users, viem };
};
