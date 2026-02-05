import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { createMinterFixture } from './fixture.js';
import { getAddress, parseEther, parseUnits, zeroAddress, keccak256, toHex } from 'viem';
import assert from 'node:assert';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('Minter', async function () {
  describe('Initialization', async function () {
    it('Should initialize correctly', async function () {
      const connection = await network.connect();
      const { minter, stableToken, treasuryVault, admin } = await createMinterFixture(connection);

      assert.equal(getAddress(await minter.read.stableToken()), getAddress(stableToken.address));
      assert.equal(getAddress(await minter.read.treasuryVault()), getAddress(treasuryVault.account.address));
      assert.equal(await minter.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address]), true);
      assert.equal(await minter.read.defaultAdminDelay(), 86400n);
    });

    it('Should prevent re-initialization', async function () {
      const connection = await network.connect();
      const { minter, stableToken, admin, treasuryVault, viem } = await createMinterFixture(connection);

      await viem.assertions.revertWithCustomError(
        minter.write.initialize([stableToken.address, admin.account.address, treasuryVault.account.address]),
        minter,
        'InvalidInitialization'
      );
    });
  });

  describe('Collateral Whitelist', async function () {
    it('Should allow admin to add collateral token', async function () {
      const connection = await network.connect();
      const { minter, admin, viem } = await createMinterFixture(connection);

      const newToken = await viem.deployContract('MockERC20', ['Test Token', 'TEST', 6]);
      await minter.write.addCollateralToken([newToken.address], { account: admin.account });

      assert.equal(await minter.read.isCollateralToken([newToken.address]), true);
      const tokens = await minter.read.getCollateralTokens();
      assert.ok(tokens.map((t: string) => getAddress(t)).includes(getAddress(newToken.address)));
    });

    it('Should allow admin to remove collateral token', async function () {
      const connection = await network.connect();
      const { minter, usdc, admin } = await createMinterFixture(connection);

      await minter.write.removeCollateralToken([usdc.address], { account: admin.account });
      assert.equal(await minter.read.isCollateralToken([usdc.address]), false);
    });

    it('Should reject non-admin adding collateral token', async function () {
      const connection = await network.connect();
      const { minter, users, viem } = await createMinterFixture(connection);

      const newToken = await viem.deployContract('MockERC20', ['Test Token', 'TEST', 6]);
      await viem.assertions.revertWithCustomError(
        minter.write.addCollateralToken([newToken.address], { account: users[0].account }),
        minter,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should reject duplicate collateral token add', async function () {
      const connection = await network.connect();
      const { minter, usdc, admin, viem } = await createMinterFixture(connection);

      await viem.assertions.revertWithCustomError(
        minter.write.addCollateralToken([usdc.address], { account: admin.account }),
        minter,
        'TokenAlreadyWhitelisted'
      );
    });
  });

  describe('Deposit and Mint', async function () {
    it('Should deposit USDC and mint StakeToken', async function () {
      const connection = await network.connect();
      const { minter, stableToken, usdc, treasuryVault, users, viem } = await createMinterFixture(connection);

      const user = users[0];
      const usdcAmount = parseUnits('1000', 6);
      await usdc.write.mint([user.account.address, usdcAmount]);
      await usdc.write.approve([minter.address, usdcAmount], { account: user.account });

      const depositTx = minter.write.deposit([usdc.address, usdcAmount], { account: user.account });
      await viem.assertions.emitWithArgs(depositTx, minter, 'Deposited', [
        getAddress(user.account.address),
        getAddress(usdc.address),
        usdcAmount,
        parseEther('1000'),
      ]);

      assert.equal(await stableToken.read.balanceOf([user.account.address]), parseEther('1000'));
      assert.equal(await usdc.read.balanceOf([treasuryVault.account.address]), usdcAmount);
    });

    it('Should reject deposit with non-whitelisted token', async function () {
      const connection = await network.connect();
      const { minter, users, viem } = await createMinterFixture(connection);

      const fakeToken = await viem.deployContract('MockERC20', ['Fake', 'FAKE', 6]);
      await viem.assertions.revertWithCustomError(
        minter.write.deposit([fakeToken.address, parseUnits('100', 6)], { account: users[0].account }),
        minter,
        'TokenNotWhitelisted'
      );
    });

    it('Should reject deposit with zero amount', async function () {
      const connection = await network.connect();
      const { minter, usdc, users, viem } = await createMinterFixture(connection);

      await viem.assertions.revertWithCustomError(
        minter.write.deposit([usdc.address, 0n], { account: users[0].account }),
        minter,
        'ZeroAmount'
      );
    });
  });

  describe('Redeem', async function () {
    it('Should redeem StakeToken for USDC', async function () {
      const connection = await network.connect();
      const { minter, stableToken, usdc, admin, users, viem } = await createMinterFixture(connection);

      const user = users[0];
      const depositUsdcAmount = parseUnits('1000', 6);
      await usdc.write.mint([user.account.address, depositUsdcAmount]);
      await usdc.write.approve([minter.address, depositUsdcAmount], { account: user.account });
      await minter.write.deposit([usdc.address, depositUsdcAmount], { account: user.account });

      const redeemVaultAmount = parseUnits('1000', 6);
      await usdc.write.mint([admin.account.address, redeemVaultAmount]);
      await usdc.write.approve([minter.address, redeemVaultAmount], { account: admin.account });
      await minter.write.depositToRedeemVault([usdc.address, redeemVaultAmount], { account: admin.account });

      const redeemStakeAmount = parseEther('500');
      const expectedUsdcBack = parseUnits('500', 6);

      const redeemTx = minter.write.redeem([usdc.address, redeemStakeAmount], { account: user.account });
      await viem.assertions.emitWithArgs(redeemTx, minter, 'Redeemed', [
        getAddress(user.account.address),
        getAddress(usdc.address),
        redeemStakeAmount,
        expectedUsdcBack,
      ]);

      assert.equal(await usdc.read.balanceOf([user.account.address]), expectedUsdcBack);
      assert.equal(await stableToken.read.balanceOf([user.account.address]), parseEther('500'));
    });

    it('Should reject redeem with insufficient vault balance', async function () {
      const connection = await network.connect();
      const { minter, usdc, users, viem } = await createMinterFixture(connection);

      const user = users[0];
      const usdcAmount = parseUnits('1000', 6);
      await usdc.write.mint([user.account.address, usdcAmount]);
      await usdc.write.approve([minter.address, usdcAmount], { account: user.account });
      await minter.write.deposit([usdc.address, usdcAmount], { account: user.account });

      await viem.assertions.revertWithCustomError(
        minter.write.redeem([usdc.address, parseEther('500')], { account: user.account }),
        minter,
        'InsufficientRedeemVaultBalance'
      );
    });

    it('Should reject redeem with non-whitelisted token', async function () {
      const connection = await network.connect();
      const { minter, users, viem } = await createMinterFixture(connection);

      const fakeToken = await viem.deployContract('MockERC20', ['Fake', 'FAKE', 6]);
      await viem.assertions.revertWithCustomError(
        minter.write.redeem([fakeToken.address, parseEther('100')], { account: users[0].account }),
        minter,
        'TokenNotWhitelisted'
      );
    });

    it('Should reject redeem with dust amount', async function () {
      const connection = await network.connect();
      const { minter, usdc, users, viem } = await createMinterFixture(connection);

      const user = users[0];
      const usdcAmount = parseUnits('1000', 6);
      await usdc.write.mint([user.account.address, usdcAmount]);
      await usdc.write.approve([minter.address, usdcAmount], { account: user.account });
      await minter.write.deposit([usdc.address, usdcAmount], { account: user.account });

      await viem.assertions.revertWithCustomError(
        minter.write.redeem([usdc.address, 1n], { account: user.account }),
        minter,
        'InvalidRedeemAmount'
      );
    });
  });

  describe('Treasury Vault', async function () {
    it('Should allow admin to update treasury vault', async function () {
      const connection = await network.connect();
      const { minter, admin, users } = await createMinterFixture(connection);

      const newVault = users[1].account.address;
      await minter.write.setTreasuryVault([newVault], { account: admin.account });
      assert.equal(getAddress(await minter.read.treasuryVault()), getAddress(newVault));
    });

    it('Should reject non-admin setting treasury vault', async function () {
      const connection = await network.connect();
      const { minter, users, viem } = await createMinterFixture(connection);

      await viem.assertions.revertWithCustomError(
        minter.write.setTreasuryVault([users[1].account.address], { account: users[0].account }),
        minter,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should reject zero address treasury vault', async function () {
      const connection = await network.connect();
      const { minter, admin, viem } = await createMinterFixture(connection);

      await viem.assertions.revertWithCustomError(
        minter.write.setTreasuryVault([zeroAddress], { account: admin.account }),
        minter,
        'ZeroAddress'
      );
    });
  });

  describe('Redeem Vault Management', async function () {
    it('Should allow admin to deposit to redeem vault', async function () {
      const connection = await network.connect();
      const { minter, usdc, admin } = await createMinterFixture(connection);

      const amount = parseUnits('500', 6);
      await usdc.write.mint([admin.account.address, amount]);
      await usdc.write.approve([minter.address, amount], { account: admin.account });
      await minter.write.depositToRedeemVault([usdc.address, amount], { account: admin.account });

      assert.equal(await usdc.read.balanceOf([minter.address]), amount);
    });

    it('Should allow admin to withdraw from redeem vault', async function () {
      const connection = await network.connect();
      const { minter, usdc, admin, users } = await createMinterFixture(connection);

      const amount = parseUnits('500', 6);
      await usdc.write.mint([admin.account.address, amount]);
      await usdc.write.approve([minter.address, amount], { account: admin.account });
      await minter.write.depositToRedeemVault([usdc.address, amount], { account: admin.account });

      await minter.write.withdrawFromRedeemVault([usdc.address, amount, users[0].account.address], {
        account: admin.account,
      });
      assert.equal(await usdc.read.balanceOf([users[0].account.address]), amount);
      assert.equal(await usdc.read.balanceOf([minter.address]), 0n);
    });

    it('Should reject non-admin deposit to redeem vault', async function () {
      const connection = await network.connect();
      const { minter, usdc, users, viem } = await createMinterFixture(connection);

      const amount = parseUnits('500', 6);
      await usdc.write.mint([users[0].account.address, amount]);
      await usdc.write.approve([minter.address, amount], { account: users[0].account });

      await viem.assertions.revertWithCustomError(
        minter.write.depositToRedeemVault([usdc.address, amount], { account: users[0].account }),
        minter,
        'AccessControlUnauthorizedAccount'
      );
    });
  });

  describe('Upgrade', async function () {
    it('Should only allow admin to upgrade', async function () {
      const connection = await network.connect();
      const { minter, admin, users, viem } = await createMinterFixture(connection);

      const minterV2 = await viem.deployContract('Minter');

      await viem.assertions.revertWithCustomError(
        minter.write.upgradeToAndCall([minterV2.address, '0x'], { account: users[0].account }),
        minter,
        'AccessControlUnauthorizedAccount'
      );

      await minter.write.upgradeToAndCall([minterV2.address, '0x'], { account: admin.account });
    });
  });

  describe('View Functions', async function () {
    it('Should return correct collateral tokens', async function () {
      const connection = await network.connect();
      const { minter, usdc, usdt } = await createMinterFixture(connection);

      const tokens = (await minter.read.getCollateralTokens()) as string[];
      const normalized = tokens.map((t: string) => getAddress(t));
      assert.ok(normalized.includes(getAddress(usdc.address)));
      assert.ok(normalized.includes(getAddress(usdt.address)));
      assert.equal(tokens.length, 2);
    });

    it('Should return correct redeem vault balance', async function () {
      const connection = await network.connect();
      const { minter, usdc, admin } = await createMinterFixture(connection);

      const amount = parseUnits('300', 6);
      await usdc.write.mint([admin.account.address, amount]);
      await usdc.write.approve([minter.address, amount], { account: admin.account });
      await minter.write.depositToRedeemVault([usdc.address, amount], { account: admin.account });

      assert.equal(await minter.read.getRedeemVaultBalance([usdc.address]), amount);
    });
  });
});
