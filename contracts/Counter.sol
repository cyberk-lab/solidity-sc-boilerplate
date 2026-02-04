// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";

/// @title Counter
/// @notice A simple upgradeable counter contract with access-controlled upgrades
/// @dev Uses UUPS proxy pattern with OpenZeppelin's AccessControlDefaultAdminRules for admin management
contract Counter is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    /// @notice The current counter value
    uint256 public x;

    /// @notice Emitted when the counter is incremented
    /// @param x The new counter value after increment
    /// @param by The address that triggered the increment
    event Increment(uint256 x, address indexed by);

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @dev Disables initializers in the implementation contract to prevent misuse
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the counter contract
    /// @dev Sets up access control with a 1-day admin transfer delay and initializes the UUPS module
    /// @param admin The address to be granted the default admin role
    function initialize(address admin) public initializer {
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    /// @notice Increments the counter by 1
    /// @dev Emits an {Increment} event with the new value and caller address
    function inc() public {
        x++;
        emit Increment(x, msg.sender);
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract (unused but required by interface)
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
