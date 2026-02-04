import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import CounterModule from './Counter.js';

export default buildModule('UpgradeModule', (m) => {
  const { counter } = m.useModule(CounterModule);
  const incrementer = m.getParameter('incrementer');

  const counterImplV2 = m.contract('CounterV2', [], { id: 'CounterV2Impl' });

  m.call(counter, 'upgradeToAndCall', [
    counterImplV2,
    m.encodeFunctionCall(counterImplV2, 'initializeV2', [incrementer])
  ], { id: 'UpgradeToCounterV2' });

  return { counter: m.contractAt('CounterV2', counter.address) };
});
