// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";

/// @title CounterV2
/// @notice Upgraded counter contract with role-based increment access and a secondary counter
/// @dev Extends Counter (v1) by adding INCREMENT_ROLE gating and a second counter variable `y`.
///      Uses UUPS proxy pattern with OpenZeppelin's AccessControlDefaultAdminRules for admin management.
/// @custom:storage-location The storage layout extends v1: `x` remains at its original slot,
///          and `y` is appended immediately after, preserving upgrade compatibility.
contract CounterV2 is AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    /// @notice Role identifier required to call the increment function
    /// @dev Computed as keccak256("INCREMENT_ROLE")
    bytes32 public constant INCREMENT_ROLE = keccak256("INCREMENT_ROLE");

    /// @notice The primary counter value (carried over from v1)
    uint public x;

    /// @notice The secondary counter value introduced in v2
    uint public y;

    /// @notice Emitted when the primary counter is incremented
    /// @param x The new primary counter value after increment
    /// @param by The address that triggered the increment
    event Increment(uint x, address indexed by);

    /// @notice Emitted when the secondary counter is incremented
    /// @param y The new secondary counter value after increment
    /// @param by The address that triggered the increment
    event IncrementY(uint y, address indexed by);

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @dev Disables initializers in the implementation contract to prevent misuse
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the counter contract (v1 initialization)
    /// @dev Sets up access control with a 1-day admin transfer delay and initializes the UUPS module
    /// @param admin The address to be granted the default admin role
    function initialize(address admin) public initializer {
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    /// @notice Re-initializes the contract for v2 upgrade
    /// @dev Grants INCREMENT_ROLE to the specified address. Can only be called once via reinitializer(2).
    /// @param incrementer The address to be granted the INCREMENT_ROLE
    function initializeV2(address incrementer) public reinitializer(2) {
        _grantRole(INCREMENT_ROLE, incrementer);
    }

    /// @notice Increments both counters by 1
    /// @dev Restricted to accounts with INCREMENT_ROLE. Emits both {Increment} and {IncrementY} events.
    function inc() public onlyRole(INCREMENT_ROLE) {
        x++;
        y++;
        emit Increment(x, msg.sender);
        emit IncrementY(y, msg.sender);
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract (unused but required by interface)
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
