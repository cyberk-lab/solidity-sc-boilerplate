// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title StableToken
/// @notice An upgradeable ERC20 stablecoin with permit support and role-based minting
/// @dev Uses UUPS proxy pattern with OpenZeppelin's AccessControlDefaultAdminRules for admin management
contract StableToken is ERC20Upgradeable, ERC20PermitUpgradeable, AccessControlDefaultAdminRulesUpgradeable, UUPSUpgradeable {
    /// @notice Role identifier for accounts allowed to mint tokens
    /// @dev Computed as keccak256("MINTER_ROLE")
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @dev Disables initializers in the implementation contract to prevent misuse
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the stable token contract
    /// @dev Sets up ERC20 metadata, permit, access control with a 1-day admin transfer delay, and UUPS
    /// @param admin The address to be granted the default admin role
    function initialize(address admin) public initializer {
        __ERC20_init("StableToken", "STBL");
        __ERC20Permit_init("StableToken");
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();
    }

    /// @notice Mints tokens to a specified account
    /// @dev Restricted to accounts with the MINTER_ROLE
    /// @param to The address to receive the minted tokens
    /// @param amount The amount of tokens to mint
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burns tokens from a specified account
    /// @dev Restricted to accounts with the MINTER_ROLE
    /// @param from The address to burn tokens from
    /// @param amount The amount of tokens to burn
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract (unused but required by interface)
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
