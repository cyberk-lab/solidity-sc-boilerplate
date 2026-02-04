// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Counter} from "../../contracts/Counter.sol";

contract CounterFuzzTest is Test {
    Counter public counter;
    address public admin = address(this);

    event Increment(uint x, address indexed by);

    function setUp() public {
        Counter impl = new Counter();
        bytes memory data = abi.encodeCall(Counter.initialize, (admin));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        counter = Counter(address(proxy));
    }

    function testFuzz_IncAlwaysIncreasesByOne(uint8 numCalls) public {
        uint256 calls = bound(numCalls, 1, 50);
        for (uint256 i = 0; i < calls; i++) {
            uint256 before = counter.x();
            counter.inc();
            assertEq(counter.x(), before + 1);
        }
    }

    function testFuzz_XNeverDecreases(uint8 numCalls) public {
        uint256 calls = bound(numCalls, 1, 50);
        uint256 prev = counter.x();
        for (uint256 i = 0; i < calls; i++) {
            counter.inc();
            uint256 current = counter.x();
            assertGe(current, prev);
            prev = current;
        }
    }

    function testFuzz_EmitsIncrementEvent(uint8 numCalls) public {
        uint256 calls = bound(numCalls, 1, 20);
        for (uint256 i = 0; i < calls; i++) {
            uint256 expectedX = counter.x() + 1;
            vm.expectEmit(true, true, true, true);
            emit Increment(expectedX, address(this));
            counter.inc();
        }
    }

    function testFuzz_InitializeCanOnlyBeCalledOnce(address caller) public {
        vm.prank(caller);
        vm.expectRevert();
        counter.initialize(caller);
    }

    function testFuzz_OnlyAdminCanUpgrade(address caller) public {
        vm.assume(caller != admin);
        Counter newImpl = new Counter();
        vm.prank(caller);
        vm.expectRevert();
        counter.upgradeToAndCall(address(newImpl), "");
    }
}
