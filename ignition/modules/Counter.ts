import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('CounterModule', (m) => {
  const admin = m.getParameter('admin');

  const counterImpl = m.contract('Counter', [], { id: 'CounterImpl' });
  const counterProxy = m.contract(
    'ERC1967Proxy',
    [counterImpl, m.encodeFunctionCall(counterImpl, 'initialize', [admin])],
    {
      id: 'CounterProxy',
    }
  );

  return { counter: m.contractAt('Counter', counterProxy) };
});
