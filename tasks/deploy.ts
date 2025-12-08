import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import { NetworkConnection } from 'hardhat/types/network';
import CounterModule from '../ignition/modules/Counter.js';
import { getConfig } from './CONFIG.js';

export const deployTask = task('deploy', 'Deploy the contract')
  .setAction(async () => {
    return {
      default: async (_, hre: HardhatRuntimeEnvironment) => {
        const connection = await hre.network.connect();
        const args = getConfig(hre.globalOptions.network);
        return runDeployTask(args, connection);
      },
    };
  })
  .build();

export async function runDeployTask(
  args: {
    admin: string;
  },
  connection: NetworkConnection
) {
  const { admin } = args;
  const { ignition } = connection;

  const params = {
    CounterModule: { admin },
  };

  return await ignition.deploy(CounterModule, {
    parameters: params,
    config: {
      requiredConfirmations: 1,
    },
  });
}
