import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { createStableTokenFixture } from './fixture.js';
import { getAddress, keccak256, toHex, parseEther, zeroAddress } from 'viem';
import assert from 'node:assert';

const MINTER_ROLE = keccak256(toHex('MINTER_ROLE'));
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('StableToken', async function () {
  describe('Initialization', async function () {
    it('Should initialize correctly', async function () {
      const connection = await network.connect();
      const { stableToken, admin } = await createStableTokenFixture(connection);

      assert.equal(await stableToken.read.name(), 'StableToken');
      assert.equal(await stableToken.read.symbol(), 'STBL');
      assert.equal(await stableToken.read.decimals(), 18);
      assert.equal(await stableToken.read.totalSupply(), 0n);
      assert.equal(await stableToken.read.defaultAdminDelay(), 86400n);
      assert.equal(await stableToken.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address]), true);
    });

    it('Should prevent re-initialization', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.initialize([admin.account.address]),
        stableToken,
        'InvalidInitialization'
      );
    });
  });

  describe('Minting', async function () {
    it('Should allow MINTER_ROLE to mint', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], { account: admin.account });

      const amount = parseEther('1000');
      const mintTx = stableToken.write.mint([users[0].account.address, amount], { account: minter.account });
      await viem.assertions.emitWithArgs(mintTx, stableToken, 'Transfer', [
        zeroAddress,
        getAddress(users[0].account.address),
        amount,
      ]);

      assert.equal(await stableToken.read.balanceOf([users[0].account.address]), amount);
      assert.equal(await stableToken.read.totalSupply(), amount);
    });

    it('Should reject mint from non-MINTER_ROLE', async function () {
      const connection = await network.connect();
      const { stableToken, users, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.mint([users[0].account.address, parseEther('100')], { account: users[0].account }),
        stableToken,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should reject mint from admin without MINTER_ROLE', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.mint([admin.account.address, parseEther('100')], { account: admin.account }),
        stableToken,
        'AccessControlUnauthorizedAccount'
      );
    });
  });

  describe('Burning', async function () {
    it('Should allow MINTER_ROLE to burn', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, viem } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], { account: admin.account });

      const mintAmount = parseEther('1000');
      await stableToken.write.mint([users[0].account.address, mintAmount], { account: minter.account });

      const burnAmount = parseEther('500');
      const burnTx = stableToken.write.burn([users[0].account.address, burnAmount], { account: minter.account });
      await viem.assertions.emitWithArgs(burnTx, stableToken, 'Transfer', [
        getAddress(users[0].account.address),
        zeroAddress,
        burnAmount,
      ]);

      assert.equal(await stableToken.read.balanceOf([users[0].account.address]), parseEther('500'));
      assert.equal(await stableToken.read.totalSupply(), parseEther('500'));
    });

    it('Should reject burn from non-MINTER_ROLE', async function () {
      const connection = await network.connect();
      const { stableToken, users, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.burn([users[0].account.address, parseEther('100')], { account: users[0].account }),
        stableToken,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should reject burn from admin without MINTER_ROLE', async function () {
      const connection = await network.connect();
      const { stableToken, admin, viem } = await createStableTokenFixture(connection);

      await viem.assertions.revertWithCustomError(
        stableToken.write.burn([admin.account.address, parseEther('100')], { account: admin.account }),
        stableToken,
        'AccessControlUnauthorizedAccount'
      );
    });
  });

  describe('ERC20 Transfers', async function () {
    it('Should transfer tokens between accounts', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], { account: admin.account });
      const amount = parseEther('500');
      await stableToken.write.mint([users[0].account.address, amount], { account: minter.account });

      const transferAmount = parseEther('200');
      await stableToken.write.transfer([users[1].account.address, transferAmount], { account: users[0].account });

      assert.equal(await stableToken.read.balanceOf([users[0].account.address]), amount - transferAmount);
      assert.equal(await stableToken.read.balanceOf([users[1].account.address]), transferAmount);
    });
  });

  describe('Permit', async function () {
    it('Should allow gasless approval via permit', async function () {
      const connection = await network.connect();
      const { stableToken, admin, minter, users, publicClient } = await createStableTokenFixture(connection);

      await stableToken.write.grantRole([MINTER_ROLE, minter.account.address], { account: admin.account });
      await stableToken.write.mint([users[0].account.address, parseEther('1000')], { account: minter.account });

      const owner = users[0];
      const spender = users[1].account.address;
      const value = parseEther('100');
      const nonce = await stableToken.read.nonces([owner.account.address]);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const domain = {
        name: 'StableToken',
        version: '1',
        chainId: await publicClient.getChainId(),
        verifyingContract: stableToken.address,
      };

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };

      const signature = await owner.signTypedData({
        domain,
        types,
        primaryType: 'Permit',
        message: {
          owner: owner.account.address,
          spender,
          value,
          nonce,
          deadline,
        },
      });

      const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      const v = parseInt(signature.slice(130, 132), 16);

      await stableToken.write.permit([owner.account.address, spender, value, deadline, v, r, s], {
        account: users[1].account,
      });

      assert.equal(await stableToken.read.allowance([owner.account.address, spender]), value);
    });
  });

  describe('Upgrade', async function () {
    it('Should only allow admin to upgrade', async function () {
      const connection = await network.connect();
      const { stableToken, admin, users, viem } = await createStableTokenFixture(connection);

      const stableTokenV2 = await viem.deployContract('StableToken');

      await viem.assertions.revertWithCustomError(
        stableToken.write.upgradeToAndCall([stableTokenV2.address, '0x'], { account: users[0].account }),
        stableToken,
        'AccessControlUnauthorizedAccount'
      );

      await stableToken.write.upgradeToAndCall([stableTokenV2.address, '0x'], { account: admin.account });
    });
  });
});
