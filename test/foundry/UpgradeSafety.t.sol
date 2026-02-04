// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Counter} from "../../contracts/Counter.sol";
import {CounterV2} from "../../contracts/CounterV2.sol";

contract UpgradeSafetyTest is Test {
    Counter public counterV1;
    address public admin = address(this);
    address public proxy;
    address public incrementer = address(0xBEEF);

    function setUp() public {
        Counter impl = new Counter();
        bytes memory data = abi.encodeCall(Counter.initialize, (admin));
        ERC1967Proxy erc1967Proxy = new ERC1967Proxy(address(impl), data);
        proxy = address(erc1967Proxy);
        counterV1 = Counter(proxy);
    }

    function test_StatePreservedAfterUpgrade() public {
        counterV1.inc();
        counterV1.inc();
        counterV1.inc();
        assertEq(counterV1.x(), 3);

        CounterV2 implV2 = new CounterV2();
        bytes memory upgradeData = abi.encodeCall(CounterV2.initializeV2, (incrementer));
        counterV1.upgradeToAndCall(address(implV2), upgradeData);

        CounterV2 counterV2 = CounterV2(proxy);
        assertEq(counterV2.x(), 3);
    }

    function test_NewStateWorksAfterUpgrade() public {
        CounterV2 implV2 = new CounterV2();
        bytes memory upgradeData = abi.encodeCall(CounterV2.initializeV2, (incrementer));
        counterV1.upgradeToAndCall(address(implV2), upgradeData);

        CounterV2 counterV2 = CounterV2(proxy);
        assertEq(counterV2.y(), 0);

        vm.prank(incrementer);
        counterV2.inc();
        assertEq(counterV2.y(), 1);
    }

    function test_StorageLayoutCompatibility() public {
        counterV1.inc();
        counterV1.inc();

        bytes32 xSlotBefore = vm.load(proxy, bytes32(uint256(0)));

        CounterV2 implV2 = new CounterV2();
        bytes memory upgradeData = abi.encodeCall(CounterV2.initializeV2, (incrementer));
        counterV1.upgradeToAndCall(address(implV2), upgradeData);

        bytes32 xSlotAfter = vm.load(proxy, bytes32(uint256(0)));
        assertEq(xSlotBefore, xSlotAfter);
    }

    function test_ReInitializationFails() public {
        CounterV2 implV2 = new CounterV2();
        bytes memory upgradeData = abi.encodeCall(CounterV2.initializeV2, (incrementer));
        counterV1.upgradeToAndCall(address(implV2), upgradeData);

        CounterV2 counterV2 = CounterV2(proxy);
        vm.expectRevert();
        counterV2.initializeV2(incrementer);
    }

    function test_DoubleUpgradePrevention() public {
        CounterV2 implV2 = new CounterV2();
        bytes memory upgradeData = abi.encodeCall(CounterV2.initializeV2, (incrementer));
        counterV1.upgradeToAndCall(address(implV2), upgradeData);

        CounterV2 counterV2 = CounterV2(proxy);
        CounterV2 implV2Second = new CounterV2();
        vm.expectRevert();
        counterV2.upgradeToAndCall(address(implV2Second), abi.encodeCall(CounterV2.initializeV2, (incrementer)));
    }
}
