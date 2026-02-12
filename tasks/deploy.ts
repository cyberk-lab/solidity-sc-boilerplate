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
    dailyRewardCapBps: bigint;
    redemptionDelay: bigint;
    treasuryVault: string;
    collateralTokens: string[];
  },
  connection: NetworkConnection
) {
  const { admin, dailyRewardCapBps, redemptionDelay, treasuryVault, collateralTokens } = args;
  const { ignition, viem } = connection;

  const params = {
    StableTokenModule: { admin, dailyRewardCapBps },
    StakingVaultModule: { admin, redemptionDelay },
    MinterModule: { admin, treasuryVault },
  };

  const { minter } = await ignition.deploy(StableCoinSystemModule, {
    parameters: params,
    config: {
      requiredConfirmations: 1,
    },
  });

  // Add collateral tokens that are not yet whitelisted
  for (const token of collateralTokens) {
    const isWhitelisted = await minter.read.isCollateralToken([token as `0x${string}`]);
    if (!isWhitelisted) {
      const hash = await minter.write.addCollateralToken([token as `0x${string}`]);
      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Added collateral token: ${token}`);
    } else {
      console.log(`Collateral token already whitelisted: ${token}`);
    }
  }

  return { minter };
}
