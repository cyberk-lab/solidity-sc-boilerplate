// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {StakingVault} from "../../contracts/StakingVault.sol";
import {MockERC20} from "../../contracts/mock/MockERC20.sol";

contract StakingVaultFuzzTest is Test {
    StakingVault public vault;
    MockERC20 public stableToken;
    address public admin = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    uint256 public constant SEVEN_DAYS = 7 days;

    function setUp() public {
        stableToken = new MockERC20("StableToken", "STBL", 18);
        StakingVault impl = new StakingVault();
        bytes memory data = abi.encodeCall(StakingVault.initialize, (address(stableToken), admin, SEVEN_DAYS));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        vault = StakingVault(address(proxy));
    }

    function _deposit(address user, uint256 amount) internal returns (uint256 shares) {
        stableToken.mint(user, amount);
        vm.startPrank(user);
        stableToken.approve(address(vault), amount);
        shares = vault.deposit(amount);
        vm.stopPrank();
    }

    function testFuzz_DepositMintCorrectShares(uint256 amount) public {
        amount = bound(amount, 1e6, 1e30);
        uint256 shares = _deposit(user1, amount);
        assertEq(shares, amount);
        assertEq(vault.totalAssets(), amount);
        assertEq(vault.totalSupply(), amount);
    }

    function testFuzz_DepositAfterDonationGivesFewerShares(uint256 depositAmount, uint256 donationAmount) public {
        depositAmount = bound(depositAmount, 1e6, 1e27);
        donationAmount = bound(donationAmount, depositAmount / 1e3 + 1, depositAmount);
        _deposit(user1, depositAmount);
        stableToken.mint(address(vault), donationAmount);
        _deposit(user2, depositAmount);
        assertLt(vault.balanceOf(user2), vault.balanceOf(user1));
    }

    function testFuzz_SharePriceNeverZeroAfterDeposit(uint256 amount) public {
        amount = bound(amount, 1e6, 1e30);
        _deposit(user1, amount);
        assertGt(vault.sharePrice(), 0);
    }

    function testFuzz_RedeemReturnsCorrectAssets(uint256 depositAmount, uint256 redeemShares) public {
        depositAmount = bound(depositAmount, 1e6, 1e27);
        _deposit(user1, depositAmount);
        uint256 userShares = vault.balanceOf(user1);
        redeemShares = bound(redeemShares, 1e3 + 1, userShares);

        uint256 expectedAssets = vault.previewRedeem(redeemShares);
        vm.prank(user1);
        vault.requestRedeem(redeemShares);
        vm.warp(block.timestamp + SEVEN_DAYS + 1);
        vm.prank(user1);
        uint256 received = vault.completeRedeem();
        assertEq(received, expectedAssets);
    }

    function testFuzz_ConvertRoundTrip(uint256 amount) public {
        amount = bound(amount, 1e6, 1e27);
        _deposit(user1, 1e18);
        uint256 shares = vault.previewDeposit(amount);
        uint256 assetsBack = vault.previewRedeem(shares);
        assertLe(assetsBack, amount);
        assertLe(amount - assetsBack, 1e3 + 1);
    }

    function testFuzz_CannotTransferLockedShares(
        uint256 depositAmount,
        uint256 lockAmount,
        uint256 transferAmount
    ) public {
        depositAmount = bound(depositAmount, 1e6, 1e27);
        _deposit(user1, depositAmount);
        uint256 userShares = vault.balanceOf(user1);
        lockAmount = bound(lockAmount, 1, userShares);
        transferAmount = bound(transferAmount, userShares - lockAmount + 1, userShares);

        vm.prank(user1);
        vault.requestRedeem(lockAmount);
        vm.prank(user1);
        vm.expectRevert();
        vault.transfer(user2, transferAmount);
    }

    function testFuzz_InitializeCanOnlyBeCalledOnce(address caller) public {
        vm.prank(caller);
        vm.expectRevert();
        vault.initialize(address(stableToken), caller, SEVEN_DAYS);
    }

    function testFuzz_OnlyAdminCanUpgrade(address caller) public {
        vm.assume(caller != admin);
        StakingVault newImpl = new StakingVault();
        vm.prank(caller);
        vm.expectRevert();
        vault.upgradeToAndCall(address(newImpl), "");
    }

    function testFuzz_ExcessiveDelayRejected(uint256 delay) public {
        delay = bound(delay, 30 days + 1, type(uint128).max);
        vm.expectRevert();
        vault.setRedemptionDelay(delay);
    }

    function testFuzz_FullRedeemEmptiesVault(uint256 amount) public {
        amount = bound(amount, 1e6, 1e27);
        _deposit(user1, amount);
        uint256 shares = vault.balanceOf(user1);
        vm.prank(user1);
        vault.requestRedeem(shares);
        vm.warp(block.timestamp + SEVEN_DAYS + 1);
        vm.prank(user1);
        vault.completeRedeem();
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.balanceOf(user1), 0);
    }
}
