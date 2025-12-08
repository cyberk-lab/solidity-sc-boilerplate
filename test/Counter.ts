import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { createCouterFixture, createUpgradeFixture } from './fixture.js';
import { getAddress, keccak256, toHex } from 'viem';
import { extractEvent } from '../shared/utils.js';
import assert from 'node:assert';

describe('Counter', async function () {
  describe('Increment', async function () {
    it('Should emit the Increment event when calling the inc() function', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createCouterFixture(connection);

      const user = users[0].account;

      const incTx = counter.write.inc({ account: user });
      viem.assertions.emitWithArgs(incTx, counter, 'Increment', [1n, getAddress(user.address)]);

      const txHash = await incTx;
      const event = await extractEvent(connection, counter, txHash, 'Increment');
      assert.equal(event?.args.x, 1n);
      assert.equal(event?.args.by, getAddress(user.address));
    });
  });
  describe('UpgradeTest', async function () {
    it('Should upgrade the counter to the v2 implementation', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createUpgradeFixture(connection);

      await viem.assertions.revertWithCustomError(
        counter.write.inc({ account: users[0].account }),
        counter,
        'AccessControlUnauthorizedAccount'
      );

      await counter.write.grantRole([keccak256(toHex('INCREMENT_ROLE')), users[0].account.address]);

      await counter.write.inc({ account: users[0].account });
    });
  });
});
