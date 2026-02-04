// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";

contract Counter is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    uint public x;

    event Increment(uint x, address indexed by);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    function inc() public {
        x++;
        emit Increment(x, msg.sender);
    }

    function _authorizeUpgrade(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
