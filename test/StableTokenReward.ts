import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { createStableTokenFixture } from './fixture.js';
import { getAddress, keccak256, toHex, parseEther, zeroAddress } from 'viem';
import assert from 'node:assert';

const MINTER_ROLE = keccak256(toHex('MINTER_ROLE'));
const REWARD_DISTRIBUTOR_ROLE = keccak256(toHex('REWARD_DISTRIBUTOR_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('StableToken Reward Minting', async function () {
  describe('Initialization', async function () {
    it('Should initialize reward config correctly', async function () {
      const connection = await network.connect();
      const { stableToken, rewardRecipient } = await createStableTokenFixture(connection);

      assert.equal(
        await stableToken.read.rewardRecipient(),
        getAddress(rewardRecipient.account.address),
      );
      assert.equal(await stableToken.read.dailyRewardCapBps(), 100n);
    });
  });

  describe('mintReward', async function () {
    it('Should revert without REWARD_DISTRIBUTOR_ROLE', async function () {
      const connection = await network.connect();
      const { stableToken, users, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.mintReward([parseEther('100')], { account: users[0].account }),
        stableToken,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('Should revert when amount is zero', async function () {
      const connection = await network.connect();
      const { stableToken, admin, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await viem.assertions.revertWithCustomError(
        stableToken.write.mintReward([0n], { account: users[0].account }),
        stableToken,
        'ZeroRewardAmount',
      );
    });

    it('Should mint reward to recipient', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, rewardRecipient, users, viem } =
        await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      const rewardAmount = parseEther('1000');
      const balanceBefore = await stableToken.read.balanceOf([rewardRecipient.account.address]);

      const mintTx = stableToken.write.mintReward([rewardAmount], { account: users[0].account });
      await viem.assertions.emitWithArgs(mintTx, stableToken, 'RewardMinted', [
        getAddress(rewardRecipient.account.address),
        rewardAmount,
      ]);

      const balanceAfter = await stableToken.read.balanceOf([rewardRecipient.account.address]);
      assert.equal(balanceAfter - balanceBefore, rewardAmount);
    });

    it('Should revert when exceeding daily cap', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await viem.assertions.revertWithCustomError(
        stableToken.write.mintReward([parseEther('10001')], { account: users[0].account }),
        stableToken,
        'ExceedsDailyRewardCap',
      );
    });

    it('Should allow multiple mints within cap', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await stableToken.write.mintReward([parseEther('5000')], { account: users[0].account });
      await stableToken.write.mintReward([parseEther('5000')], { account: users[0].account });
    });

    it('Should restore ~50% capacity after 12 hours', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await stableToken.write.mintReward([parseEther('10000')], { account: users[0].account });

      const testClient = await viem.getTestClient();
      await testClient.increaseTime({ seconds: 12 * 3600 });
      await testClient.mine({ blocks: 1 });

      await stableToken.write.mintReward([parseEther('5000')], { account: users[0].account });
    });

    it('Should restore full capacity after 24 hours', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await stableToken.write.mintReward([parseEther('10000')], { account: users[0].account });

      const testClient = await viem.getTestClient();
      await testClient.increaseTime({ seconds: 24 * 3600 + 1 });
      await testClient.mine({ blocks: 1 });

      await stableToken.write.mintReward([parseEther('10000')], { account: users[0].account });
    });

    it('Should revert on zero supply', async function () {
      const connection = await network.connect();
      const { stableToken, admin, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await viem.assertions.revertWithCustomError(
        stableToken.write.mintReward([1n], { account: users[0].account }),
        stableToken,
        'ExceedsDailyRewardCap',
      );
    });
  });

  describe('setRewardRecipient', async function () {
    it('Should update reward recipient', async function () {
      const connection = await network.connect();
      const { stableToken, admin, rewardRecipient, users, viem } =
        await createStableTokenFixture(connection);

      const newRecipient = users[0].account.address;
      const setTx = stableToken.write.setRewardRecipient([newRecipient], {
        account: admin.account,
      });
      await viem.assertions.emitWithArgs(setTx, stableToken, 'RewardRecipientUpdated', [
        getAddress(rewardRecipient.account.address),
        getAddress(newRecipient),
      ]);

      assert.equal(await stableToken.read.rewardRecipient(), getAddress(newRecipient));
    });

    it('Should revert on zero address', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.setRewardRecipient([zeroAddress], { account: admin.account }),
        stableToken,
        'InvalidRewardRecipient',
      );
    });

    it('Should revert for non-admin', async function () {
      const connection = await network.connect();
      const { stableToken, users, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.setRewardRecipient([users[1].account.address], {
          account: users[0].account,
        }),
        stableToken,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('setDailyRewardCap', async function () {
    it('Should update daily reward cap', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      const setTx = stableToken.write.setDailyRewardCap([200n], { account: admin.account });
      await viem.assertions.emitWithArgs(setTx, stableToken, 'DailyRewardCapUpdated', [
        100n,
        200n,
      ]);

      assert.equal(await stableToken.read.dailyRewardCapBps(), 200n);
    });

    it('Should revert above MAX_DAILY_REWARD_CAP_BPS', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.setDailyRewardCap([501n], { account: admin.account }),
        stableToken,
        'ExcessiveRewardCap',
      );
    });

    it('Should revert for non-admin', async function () {
      const connection = await network.connect();
      const { stableToken, users, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.setDailyRewardCap([200n], { account: users[0].account }),
        stableToken,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('availableRewardMint', async function () {
    it('Should return correct available after partial usage', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await stableToken.write.mintReward([parseEther('5000')], { account: users[0].account });

      const available = await stableToken.read.availableRewardMint();
      const totalSupply = await stableToken.read.totalSupply();
      const maxMint = totalSupply * 100n / 10000n;
      assert.ok(available > 0n);
      assert.ok(available < maxMint);
    });
  });

  describe('Cap reduction edge case', async function () {
    it('Should handle cap reduction while capacity partially used', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], {
        account: admin.account,
      });
      await stableToken.write.mint([users[1].account.address, parseEther('1000000')], {
        account: minter.account,
      });

      await stableToken.write.grantRole([REWARD_DISTRIBUTOR_ROLE, users[0].account.address], {
        account: admin.account,
      });

      await stableToken.write.mintReward([parseEther('5000')], { account: users[0].account });

      await stableToken.write.setDailyRewardCap([10n], { account: admin.account });

      const available = await stableToken.read.availableRewardMint();
      assert.equal(available, 0n);

      await viem.assertions.revertWithCustomError(
        stableToken.write.mintReward([parseEther('1')], { account: users[0].account }),
        stableToken,
        'ExceedsDailyRewardCap',
      );
    });
  });
});
