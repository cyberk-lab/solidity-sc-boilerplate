import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { createCounterFixture, createUpgradeFixture, deployImplementation } from './fixture.js';
import { getAddress, keccak256, toHex, encodeFunctionData } from 'viem';
import assert from 'node:assert';

const INCREMENT_ROLE = keccak256(toHex('INCREMENT_ROLE'));

describe('Counter', async function () {
  describe('V1', async function () {
    it('Should initialize correctly and prevent re-init', async function () {
      const connection = await network.connect();
      const { counter, admin, viem } = await createCounterFixture(connection);

      assert.equal(await counter.read.x(), 0n);
      assert.equal(await counter.read.defaultAdminDelay(), 86400n); // 1 day

      await viem.assertions.revertWithCustomError(
        counter.write.initialize([admin.account.address]),
        counter,
        'InvalidInitialization'
      );
    });

    it('Should increment and emit event', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createCounterFixture(connection);

      const incTx = counter.write.inc({ account: users[0].account });
      await viem.assertions.emitWithArgs(incTx, counter, 'Increment', [1n, getAddress(users[0].account.address)]);

      assert.equal(await counter.read.x(), 1n);
    });

    it('Should only allow admin to upgrade', async function () {
      const connection = await network.connect();
      const { counter, admin, users, viem } = await createCounterFixture(connection);

      const counterV2 = await viem.deployContract('CounterV2');

      await viem.assertions.revertWithCustomError(
        counter.write.upgradeToAndCall([counterV2.address, '0x'], { account: users[0].account }),
        counter,
        'AccessControlUnauthorizedAccount'
      );

      await counter.write.upgradeToAndCall([counterV2.address, '0x'], { account: admin.account });
    });
  });

  describe('Upgrade', async function () {
    it('Should preserve x and call initializeV2', async function () {
      const connection = await network.connect();
      const { counter, admin, users, viem } = await createCounterFixture(connection);

      await counter.write.inc({ account: users[0].account });
      await counter.write.inc({ account: users[0].account });

      const counterV2Impl = await viem.deployContract('CounterV2');
      const initData = encodeFunctionData({
        abi: counterV2Impl.abi,
        functionName: 'initializeV2',
        args: [users[0].account.address],
      });

      await counter.write.upgradeToAndCall([counterV2Impl.address, initData], { account: admin.account });

      const counterV2 = await viem.getContractAt('CounterV2', counter.address);
      assert.equal(await counterV2.read.x(), 2n);
      assert.equal(await counterV2.read.y(), 0n);
      assert.equal(await counterV2.read.hasRole([INCREMENT_ROLE, users[0].account.address]), true);
    });

    it('Should prevent initializeV2 re-call', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createUpgradeFixture(connection);

      await viem.assertions.revertWithCustomError(
        counter.write.initializeV2([users[1].account.address]),
        counter,
        'InvalidInitialization'
      );
    });
  });

  describe('V2', async function () {
    it('Should require INCREMENT_ROLE to inc()', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createUpgradeFixture(connection);

      await viem.assertions.revertWithCustomError(
        counter.write.inc({ account: users[1].account }),
        counter,
        'AccessControlUnauthorizedAccount'
      );

      await counter.write.inc({ account: users[0].account });
      assert.equal(await counter.read.x(), 1n);
      assert.equal(await counter.read.y(), 1n);
    });

    it('Should emit both events', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createUpgradeFixture(connection);

      const incTx = counter.write.inc({ account: users[0].account });
      await viem.assertions.emitWithArgs(incTx, counter, 'Increment', [1n, getAddress(users[0].account.address)]);
      await viem.assertions.emitWithArgs(incTx, counter, 'IncrementY', [1n, getAddress(users[0].account.address)]);
    });

    it('Should only allow admin to upgrade', async function () {
      const connection = await network.connect();
      const { counter, users, viem } = await createUpgradeFixture(connection);

      const counterV3 = await viem.deployContract('CounterV2');

      await viem.assertions.revertWithCustomError(
        counter.write.upgradeToAndCall([counterV3.address, '0x'], { account: users[0].account }),
        counter,
        'AccessControlUnauthorizedAccount'
      );
    });
  });
});
