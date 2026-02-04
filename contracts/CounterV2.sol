// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";

contract CounterV2 is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    bytes32 public constant INCREMENT_ROLE = keccak256("INCREMENT_ROLE");

    uint public x;
    uint public y;

    event Increment(uint x, address indexed by);
    event IncrementY(uint y, address indexed by);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    function initializeV2(address incrementer) public reinitializer(2) {
        _grantRole(INCREMENT_ROLE, incrementer);
    }

    function inc() public onlyRole(INCREMENT_ROLE) {
        x++;
        y++;
        emit Increment(x, msg.sender);
        emit IncrementY(y, msg.sender);
    }

    function _authorizeUpgrade(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
