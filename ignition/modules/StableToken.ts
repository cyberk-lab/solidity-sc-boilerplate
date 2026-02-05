import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('StableTokenModule', (m) => {
  const admin = m.getParameter('admin');
  const rewardRecipient = m.getParameter('rewardRecipient');
  const dailyRewardCapBps = m.getParameter('dailyRewardCapBps', 100n);

  const stableTokenImpl = m.contract('StableToken', [], { id: 'StableTokenImpl' });
  const stableTokenProxy = m.contract(
    'ERC1967Proxy',
    [stableTokenImpl, m.encodeFunctionCall(stableTokenImpl, 'initialize', [admin, rewardRecipient, dailyRewardCapBps])],
    {
      id: 'StableTokenProxy',
    }
  );

  return { stableToken: m.contractAt('StableToken', stableTokenProxy) };
});
