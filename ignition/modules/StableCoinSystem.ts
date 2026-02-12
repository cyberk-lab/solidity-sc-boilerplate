import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import StakingVaultModule from './StakingVault.js';

export default buildModule('StableCoinSystemModule', (m) => {
  const { stableToken, vault } = m.useModule(StakingVaultModule);

  m.call(stableToken, 'setRewardRecipient', [vault]);

  return { stableToken, vault };
});
