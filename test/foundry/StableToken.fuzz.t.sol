// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {StableToken} from "../../contracts/StableToken.sol";

contract StableTokenFuzzTest is Test {
    StableToken public stableToken;
    address public admin = address(this);
    address public vault = address(0xBEEF);
    address public distributor = address(0xCAFE);
    address public minterAddr = address(0xDEAD);
    uint256 public constant DAILY_CAP_BPS = 100; // 1%

    function setUp() public {
        StableToken impl = new StableToken();
        bytes memory data = abi.encodeCall(StableToken.initialize, (admin, vault, DAILY_CAP_BPS));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        stableToken = StableToken(address(proxy));
        stableToken.grantRole(stableToken.REWARD_DISTRIBUTOR_ROLE(), distributor);
        stableToken.grantRole(stableToken.MINTER_ROLE(), minterAddr);
    }

    function _mintSupply(uint256 amount) internal {
        vm.prank(minterAddr);
        stableToken.mint(address(0x1111), amount);
    }

    function testFuzz_MintRewardNeverExceedsCap(uint256 supply, uint256 rewardAmount) public {
        supply = bound(supply, 1e18, 1e30);
        uint256 maxReward = supply * DAILY_CAP_BPS / 10_000;
        rewardAmount = bound(rewardAmount, 1, maxReward);

        _mintSupply(supply);

        vm.prank(distributor);
        stableToken.mintReward(rewardAmount);

        assertEq(stableToken.balanceOf(vault), rewardAmount);
    }

    function testFuzz_MintRewardRevertsAboveCap(uint256 supply, uint256 rewardAmount) public {
        supply = bound(supply, 1e18, 1e30);
        uint256 maxReward = supply * DAILY_CAP_BPS / 10_000;
        rewardAmount = bound(rewardAmount, maxReward + 1, maxReward * 2 + 1);

        _mintSupply(supply);

        vm.prank(distributor);
        vm.expectRevert();
        stableToken.mintReward(rewardAmount);
    }

    function testFuzz_LinearDecayRestoresCapacity(uint256 supply, uint256 elapsed) public {
        supply = bound(supply, 1e18, 1e27);
        elapsed = bound(elapsed, 0, 2 days);

        _mintSupply(supply);

        uint256 maxReward = supply * DAILY_CAP_BPS / 10_000;

        vm.prank(distributor);
        stableToken.mintReward(maxReward);

        vm.warp(block.timestamp + elapsed);

        uint256 available = stableToken.availableRewardMint();

        uint256 newTotalSupply = supply + maxReward;
        uint256 newMaxMint = newTotalSupply * DAILY_CAP_BPS / 10_000;
        uint256 currentMinted;
        if (elapsed >= 1 days) {
            currentMinted = 0;
        } else {
            uint256 decayed = maxReward * elapsed / 1 days;
            currentMinted = maxReward - decayed;
        }
        uint256 expected = newMaxMint > currentMinted ? newMaxMint - currentMinted : 0;

        assertLe(available > expected ? available - expected : expected - available, 1);
    }

    function testFuzz_OnlyDistributorCanMintReward(address caller) public {
        vm.assume(caller != distributor && caller != admin && caller != address(0));

        _mintSupply(1e24);

        vm.prank(caller);
        vm.expectRevert();
        stableToken.mintReward(1);
    }

    function testFuzz_CapReductionSaturates(uint256 supply, uint256 usedAmount, uint256 newCapBps) public {
        supply = bound(supply, 1e18, 1e27);
        uint256 maxReward = supply * DAILY_CAP_BPS / 10_000;
        usedAmount = bound(usedAmount, 1, maxReward);
        newCapBps = bound(newCapBps, 0, DAILY_CAP_BPS);

        _mintSupply(supply);

        vm.prank(distributor);
        stableToken.mintReward(usedAmount);

        stableToken.setDailyRewardCap(newCapBps);

        uint256 available = stableToken.availableRewardMint();
        assertLe(available, supply * newCapBps / 10_000);
    }
}
