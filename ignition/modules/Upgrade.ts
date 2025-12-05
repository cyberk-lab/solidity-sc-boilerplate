import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import CounterModule from './Counter.js';

export default buildModule('UpgradeModule', (m) => {
  const { counter } = m.useModule(CounterModule);

  const counterImplV2 = m.contract('CounterV2', [], { id: 'CounterV2Impl' });

  m.call(counter, 'upgradeToAndCall', [counterImplV2, '0x'], { id: 'UpgradeToCounterV2' });

  return { counter: m.contractAt('CounterV2', counter.address) };
});
