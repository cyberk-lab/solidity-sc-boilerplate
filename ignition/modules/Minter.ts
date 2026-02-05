import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import StableTokenModule from './StableToken.js';

export default buildModule('MinterModule', (m) => {
  const admin = m.getParameter('admin');
  const treasuryVault = m.getParameter('treasuryVault');

  const { stableToken } = m.useModule(StableTokenModule);

  const minterImpl = m.contract('Minter', [], { id: 'MinterImpl' });
  const minterProxy = m.contract(
    'ERC1967Proxy',
    [minterImpl, m.encodeFunctionCall(minterImpl, 'initialize', [stableToken, admin, treasuryVault])],
    {
      id: 'MinterProxy',
    }
  );

  const minter = m.contractAt('Minter', minterProxy);

  return { minter, stableToken };
});
