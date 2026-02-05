import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { createStakingVaultFixture } from './fixture.js';
import { getAddress, parseEther, zeroAddress } from 'viem';
import assert from 'node:assert';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const SEVEN_DAYS = 7n * 24n * 60n * 60n;

describe('StakingVault', async function () {
  describe('Initialization', async function () {
    it('Should initialize correctly', async function () {
      const connection = await network.connect();
      const { vault, stableToken, admin } = await createStakingVaultFixture(connection);

      assert.equal(await vault.read.name(), 'Staked StableToken');
      assert.equal(await vault.read.symbol(), 'sSTBL');
      assert.equal(getAddress(await vault.read.stableToken()), getAddress(stableToken.address));
      assert.equal(await vault.read.redemptionDelay(), SEVEN_DAYS);
      assert.equal(await vault.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address]), true);
    });

    it('Should prevent re-initialization', async function () {
      const connection = await network.connect();
      const { vault, stableToken, admin, viem } = await createStakingVaultFixture(connection);

      await viem.assertions.revertWithCustomError(
        vault.write.initialize([stableToken.address, admin.account.address, SEVEN_DAYS]),
        vault,
        'InvalidInitialization'
      );
    });
  });

  describe('Deposit', async function () {
    it('Should deposit and mint shares', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });

      const depositTx = vault.write.deposit([amount], { account: user.account });
      await viem.assertions.emitWithArgs(depositTx, vault, 'Deposited', [
        getAddress(user.account.address),
        amount,
        amount,
      ]);

      assert.equal(await vault.read.balanceOf([user.account.address]), amount);
      assert.equal(await vault.read.totalAssets(), amount);
      assert.equal(await vault.read.totalSupply(), amount);
    });

    it('Should deposit at current rate after donation', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users } = await createStakingVaultFixture(connection);

      const user1 = users[0];
      const user2 = users[1];
      const amount = parseEther('1000');

      await stableToken.write.mint([user1.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user1.account });
      await vault.write.deposit([amount], { account: user1.account });

      await stableToken.write.mint([vault.address, amount]);

      await stableToken.write.mint([user2.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user2.account });
      await vault.write.deposit([amount], { account: user2.account });

      const user2Shares = await vault.read.balanceOf([user2.account.address]);
      const user1Shares = await vault.read.balanceOf([user1.account.address]);
      // After donation, rate doubled: totalAssets=2000, totalSupply=1000
      // shares = 1000 * (1000 + 1000) / (2000 + 1) ≈ 999.5
      // User2 should get fewer shares than user1 due to the virtual offset
      assert.ok(user2Shares > 0n);
      assert.ok(user2Shares <= user1Shares);
    });

    it('Should reject zero deposit', async function () {
      const connection = await network.connect();
      const { vault, viem } = await createStakingVaultFixture(connection);

      await viem.assertions.revertWithCustomError(vault.write.deposit([0n]), vault, 'ZeroAmount');
    });

    it('Should reject deposit below minimum on first deposit', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      await stableToken.write.mint([user.account.address, 100n]);
      await stableToken.write.approve([vault.address, 100n], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.deposit([100n], { account: user.account }),
        vault,
        'BelowMinimumDeposit'
      );
    });

    it('Should reject deposit when paused', async function () {
      const connection = await network.connect();
      const { vault, stableToken, admin, users, viem } = await createStakingVaultFixture(connection);

      await vault.write.setDepositsPaused([true], { account: admin.account });

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.deposit([amount], { account: user.account }),
        vault,
        'DepositsPaused'
      );
    });
  });

  describe('Share Price', async function () {
    it('Should return ~1e15 when empty (virtual offset: 1 asset / 1000 shares)', async function () {
      const connection = await network.connect();
      const { vault } = await createStakingVaultFixture(connection);

      const price = await vault.read.sharePrice();
      assert.equal(price, (1n * parseEther('1')) / 1000n);
    });

    it('Should increase with direct transfer', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await stableToken.write.mint([vault.address, amount]);

      const price = await vault.read.sharePrice();
      assert.ok(price > parseEther('1'));
      assert.ok(price <= parseEther('2'));
    });

    it('Should return correct previewDeposit and previewRedeem', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      const previewShares = await vault.read.previewDeposit([parseEther('500')]);
      assert.ok(previewShares > 0n);

      const previewAssets = await vault.read.previewRedeem([parseEther('500')]);
      assert.ok(previewAssets > 0n);
    });
  });

  describe('Redemption Flow', async function () {
    it('Should request redeem and lock shares', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      const redeemShares = parseEther('500');
      await vault.write.requestRedeem([redeemShares], { account: user.account });

      assert.equal(await vault.read.lockedShares([user.account.address]), redeemShares);
      const request = await vault.read.getRedemptionRequest([user.account.address]);
      assert.equal(request.shares, redeemShares);
      assert.ok(request.unlockTime > 0n);
    });

    it('Should complete redeem after delay', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, publicClient, viem } = await createStakingVaultFixture(connection);
      const { networkHelpers } = connection;

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      const redeemShares = parseEther('500');
      await vault.write.requestRedeem([redeemShares], { account: user.account });

      await networkHelpers.time.increase(SEVEN_DAYS);

      const balanceBefore = await stableToken.read.balanceOf([user.account.address]);
      await vault.write.completeRedeem({ account: user.account });
      const balanceAfter = await stableToken.read.balanceOf([user.account.address]);

      assert.ok(balanceAfter > balanceBefore);
      assert.equal(await vault.read.balanceOf([user.account.address]), amount - redeemShares);
      assert.equal(await vault.read.lockedShares([user.account.address]), 0n);
    });

    it('Should reject complete before delay', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await vault.write.requestRedeem([parseEther('500')], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.completeRedeem({ account: user.account }),
        vault,
        'RedemptionNotReady'
      );
    });

    it('Should cancel redeem', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      const redeemShares = parseEther('500');
      await vault.write.requestRedeem([redeemShares], { account: user.account });

      const cancelTx = vault.write.cancelRedeem({ account: user.account });
      await viem.assertions.emitWithArgs(cancelTx, vault, 'RedeemCancelled', [
        getAddress(user.account.address),
        redeemShares,
      ]);

      assert.equal(await vault.read.lockedShares([user.account.address]), 0n);
      const request = await vault.read.getRedemptionRequest([user.account.address]);
      assert.equal(request.shares, 0n);
    });

    it('Should reject request when pending exists', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await vault.write.requestRedeem([parseEther('300')], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.requestRedeem([parseEther('200')], { account: user.account }),
        vault,
        'PendingRedemptionExists'
      );
    });

    it('Should reject request with insufficient balance', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.requestRedeem([parseEther('2000')], { account: user.account }),
        vault,
        'InsufficientBalance'
      );
    });

    it('Should reject complete with no request', async function () {
      const connection = await network.connect();
      const { vault, users, viem } = await createStakingVaultFixture(connection);

      await viem.assertions.revertWithCustomError(
        vault.write.completeRedeem({ account: users[0].account }),
        vault,
        'NoRedemptionRequest'
      );
    });

    it('Should reject request when paused', async function () {
      const connection = await network.connect();
      const { vault, stableToken, admin, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await vault.write.setRedemptionsPaused([true], { account: admin.account });

      await viem.assertions.revertWithCustomError(
        vault.write.requestRedeem([parseEther('500')], { account: user.account }),
        vault,
        'RedemptionsPaused'
      );
    });
  });

  describe('Locked Shares / Transfer', async function () {
    it('Should transfer unlocked shares', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users } = await createStakingVaultFixture(connection);

      const user = users[0];
      const receiver = users[1];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await vault.write.requestRedeem([parseEther('500')], { account: user.account });
      await vault.write.transfer([receiver.account.address, parseEther('500')], { account: user.account });

      assert.equal(await vault.read.balanceOf([receiver.account.address]), parseEther('500'));
    });

    it('Should reject transfer of locked shares', async function () {
      const connection = await network.connect();
      const { vault, stableToken, users, viem } = await createStakingVaultFixture(connection);

      const user = users[0];
      const receiver = users[1];
      const amount = parseEther('1000');
      await stableToken.write.mint([user.account.address, amount]);
      await stableToken.write.approve([vault.address, amount], { account: user.account });
      await vault.write.deposit([amount], { account: user.account });

      await vault.write.requestRedeem([parseEther('600')], { account: user.account });

      await viem.assertions.revertWithCustomError(
        vault.write.transfer([receiver.account.address, parseEther('500')], { account: user.account }),
        vault,
        'InsufficientUnlockedBalance'
      );
    });
  });

  describe('Admin Functions', async function () {
    it('Should set redemption delay', async function () {
      const connection = await network.connect();
      const { vault, admin, viem } = await createStakingVaultFixture(connection);

      const newDelay = 14n * 24n * 60n * 60n;
      const setTx = vault.write.setRedemptionDelay([newDelay], { account: admin.account });
      await viem.assertions.emitWithArgs(setTx, vault, 'RedemptionDelayUpdated', [SEVEN_DAYS, newDelay]);

      assert.equal(await vault.read.redemptionDelay(), newDelay);
    });

    it('Should pause/unpause deposits', async function () {
      const connection = await network.connect();
      const { vault, admin, viem } = await createStakingVaultFixture(connection);

      const pauseTx = vault.write.setDepositsPaused([true], { account: admin.account });
      await viem.assertions.emitWithArgs(pauseTx, vault, 'DepositsPausedUpdated', [true]);
      assert.equal(await vault.read.depositsPaused(), true);

      const unpauseTx = vault.write.setDepositsPaused([false], { account: admin.account });
      await viem.assertions.emitWithArgs(unpauseTx, vault, 'DepositsPausedUpdated', [false]);
      assert.equal(await vault.read.depositsPaused(), false);
    });

    it('Should pause/unpause redemptions', async function () {
      const connection = await network.connect();
      const { vault, admin, viem } = await createStakingVaultFixture(connection);

      const pauseTx = vault.write.setRedemptionsPaused([true], { account: admin.account });
      await viem.assertions.emitWithArgs(pauseTx, vault, 'RedemptionsPausedUpdated', [true]);
      assert.equal(await vault.read.redemptionsPaused(), true);

      const unpauseTx = vault.write.setRedemptionsPaused([false], { account: admin.account });
      await viem.assertions.emitWithArgs(unpauseTx, vault, 'RedemptionsPausedUpdated', [false]);
      assert.equal(await vault.read.redemptionsPaused(), false);
    });

    it('Should reject non-admin setting delay', async function () {
      const connection = await network.connect();
      const { vault, users, viem } = await createStakingVaultFixture(connection);

      await viem.assertions.revertWithCustomError(
        vault.write.setRedemptionDelay([1000n], { account: users[0].account }),
        vault,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should reject excessive redemption delay', async function () {
      const connection = await network.connect();
      const { vault, admin, viem } = await createStakingVaultFixture(connection);

      const excessive = 31n * 24n * 60n * 60n;
      await viem.assertions.revertWithCustomError(
        vault.write.setRedemptionDelay([excessive], { account: admin.account }),
        vault,
        'ExcessiveDelay'
      );
    });
  });

  describe('Upgrade', async function () {
    it('Should only allow admin to upgrade', async function () {
      const connection = await network.connect();
      const { vault, admin, users, viem } = await createStakingVaultFixture(connection);

      const vaultV2 = await viem.deployContract('StakingVault');

      await viem.assertions.revertWithCustomError(
        vault.write.upgradeToAndCall([vaultV2.address, '0x'], { account: users[0].account }),
        vault,
        'AccessControlUnauthorizedAccount'
      );

      await vault.write.upgradeToAndCall([vaultV2.address, '0x'], { account: admin.account });
    });
  });
});
