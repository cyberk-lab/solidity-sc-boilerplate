import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment } from 'hardhat/types/hre';
import type { NetworkConnection } from 'hardhat/types/network';
import StableCoinSystemModule from '../ignition/modules/StableCoinSystem.js';
import { getConfig } from './CONFIG.js';

export const deployTask = task('deploy', 'Deploy the contract')
  .setAction(async () => {
    return {
      default: async (_: unknown, hre: HardhatRuntimeEnvironment) => {
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
    rewardRecipient: string;
    dailyRewardCapBps: bigint;
    redemptionDelay: bigint;
  },
  connection: NetworkConnection
) {
  const { admin, rewardRecipient, dailyRewardCapBps, redemptionDelay } = args;
  const { ignition } = connection;

  const params = {
    StableTokenModule: { admin, rewardRecipient, dailyRewardCapBps },
    StakingVaultModule: { admin, redemptionDelay },
  };

  return await ignition.deploy(StableCoinSystemModule, {
    parameters: params,
    config: {
      requiredConfirmations: 1,
    },
  });
}
