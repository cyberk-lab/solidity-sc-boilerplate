import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('StakingVaultModule', (m) => {
  const admin = m.getParameter('admin');
  const stableToken = m.getParameter('stableToken');
  const redemptionDelay = m.getParameter('redemptionDelay', 7n * 24n * 60n * 60n);

  const vaultImpl = m.contract('StakingVault', [], { id: 'StakingVaultImpl' });
  const vaultProxy = m.contract(
    'ERC1967Proxy',
    [vaultImpl, m.encodeFunctionCall(vaultImpl, 'initialize', [stableToken, admin, redemptionDelay])],
    {
      id: 'StakingVaultProxy',
    }
  );

  const vault = m.contractAt('StakingVault', vaultProxy);

  return { vault };
});
