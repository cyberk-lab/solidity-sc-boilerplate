// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Counter} from "../../contracts/Counter.sol";

contract CounterHandler is Test {
    Counter public counter;
    uint256 public callCount;

    constructor(Counter _counter) {
        counter = _counter;
    }

    function inc() external {
        counter.inc();
        callCount++;
    }
}

contract CounterInvariantTest is Test {
    Counter public counter;
    CounterHandler public handler;

    function setUp() public {
        Counter impl = new Counter();
        bytes memory data = abi.encodeCall(Counter.initialize, (address(this)));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), data);
        counter = Counter(address(proxy));

        handler = new CounterHandler(counter);
        targetContract(address(handler));
    }

    function invariant_XEqualsCallCount() public view {
        assertEq(counter.x(), handler.callCount());
    }

    function invariant_XNeverOverflowsUnexpectedly() public view {
        assertGe(counter.x(), 0);
        assertEq(counter.x(), handler.callCount());
    }
}
