import { NetworkConnection } from 'hardhat/types/network';
import type { IgnitionModule, IgnitionModuleResult, StrategyConfig } from '@nomicfoundation/ignition-core';
import CounterModule from '../ignition/modules/Counter.js';
import UpgradeModule from '../ignition/modules/Upgrade.js';

export const createCouterFixture = async (connection: NetworkConnection) => {
  const { ignition, viem } = connection;

  const [admin, ...users] = await viem.getWalletClients();

  const { counter } = await ignition.deploy(CounterModule, {
    parameters: {
      CounterModule: {
        admin: admin.account.address,
      },
    },
  });

  return { counter, admin, users };
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
