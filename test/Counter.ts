import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network } from 'hardhat';
import { createCouterFixture, createUpgradeFixture } from './fixture.js';
import { keccak256, toHex } from 'viem';

describe('Counter', async function () {
  describe('Increment', async function () {
    it('Should emit the Increment event when calling the inc() function', async function () {
      const connection = await network.connect();
      const { counter, admin, users } = await createCouterFixture(connection);

      await counter.write.inc({ account: users[0].account });
    });
  });
  describe('UpgradeTest', async function () {
    it('Should upgrade the counter to the v2 implementation', async function () {
      const connection = await network.connect();
      const { counter, admin, users, viem } = await createUpgradeFixture(connection);

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
