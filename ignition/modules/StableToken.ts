import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('StableTokenModule', (m) => {
  const admin = m.getParameter('admin');

  const stableTokenImpl = m.contract('StableToken', [], { id: 'StableTokenImpl' });
  const stableTokenProxy = m.contract(
    'ERC1967Proxy',
    [stableTokenImpl, m.encodeFunctionCall(stableTokenImpl, 'initialize', [admin])],
    {
      id: 'StableTokenProxy',
    }
  );

  return { stableToken: m.contractAt('StableToken', stableTokenProxy) };
});
