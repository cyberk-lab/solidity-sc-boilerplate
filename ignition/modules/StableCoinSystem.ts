import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { keccak256, toHex } from 'viem';
import MinterModule from './Minter.js';
import StakingVaultModule from './StakingVault.js';

const MINTER_ROLE = keccak256(toHex('MINTER_ROLE'));

export default buildModule('StableCoinSystemModule', (m) => {
  const { stableToken, vault } = m.useModule(StakingVaultModule);
  const { minter } = m.useModule(MinterModule);

  m.call(stableToken, 'setRewardRecipient', [vault], { id: 'SetRewardRecipient' });
  m.call(stableToken, 'grantRole', [MINTER_ROLE, minter], { id: 'GrantMinterRole' });

  return { stableToken, vault, minter };
});
