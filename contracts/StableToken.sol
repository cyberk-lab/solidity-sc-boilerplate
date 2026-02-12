// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title StableToken
/// @notice An upgradeable ERC20 stablecoin with permit support and role-based minting
/// @dev Uses UUPS proxy pattern with OpenZeppelin's AccessControlDefaultAdminRules for admin management
contract StableToken is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    AccessControlDefaultAdminRulesUpgradeable,
    UUPSUpgradeable
{
    /// @notice Role identifier for accounts allowed to mint tokens
    /// @dev Computed as keccak256("MINTER_ROLE")
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role identifier for accounts allowed to distribute rewards
    /// @dev Computed as keccak256("REWARD_DISTRIBUTOR_ROLE")
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");

    /// @notice Hard ceiling for daily reward cap in basis points (1%)
    uint256 public constant MAX_DAILY_REWARD_CAP_BPS = 100;

    /// @notice Address that receives minted reward tokens
    address public rewardRecipient;

    /// @notice Daily reward cap in basis points relative to total supply
    uint256 public dailyRewardCapBps;

    /// @notice Amount of reward tokens minted in the current UTC day
    uint256 public mintedInCurrentPeriod;

    /// @notice UTC day number of the last reward mint operation (block.timestamp / 86400)
    uint256 public lastMintDay;

    uint256[40] private __gap;

    /// @notice Emitted when reward tokens are minted
    /// @param recipient The address that received the reward tokens
    /// @param amount The amount of tokens minted
    event RewardMinted(address indexed recipient, uint256 amount);

    /// @notice Emitted when the reward recipient address is updated
    /// @param oldRecipient The previous reward recipient address
    /// @param newRecipient The new reward recipient address
    event RewardRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    /// @notice Emitted when the daily reward cap is updated
    /// @param oldCapBps The previous cap in basis points
    /// @param newCapBps The new cap in basis points
    event DailyRewardCapUpdated(uint256 oldCapBps, uint256 newCapBps);

    /// @notice Thrown when a reward mint request exceeds the available daily cap
    /// @param requested The amount requested to mint
    /// @param available The amount currently available to mint
    error ExceedsDailyRewardCap(uint256 requested, uint256 available);

    /// @notice Thrown when the reward recipient address is invalid (zero address)
    error InvalidRewardRecipient();

    /// @notice Thrown when the reward cap exceeds the maximum allowed value
    /// @param capBps The requested cap in basis points
    /// @param maxCapBps The maximum allowed cap in basis points
    error ExcessiveRewardCap(uint256 capBps, uint256 maxCapBps);

    /// @notice Thrown when a zero amount is passed to mintReward
    error ZeroRewardAmount();

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @dev Disables initializers in the implementation contract to prevent misuse
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the stable token contract
    /// @dev Sets up ERC20 metadata, permit, access control with a 1-day admin transfer delay, and UUPS
    /// @param admin The address to be granted the default admin role
    /// @param dailyRewardCapBps_ The daily reward cap in basis points (must not exceed MAX_DAILY_REWARD_CAP_BPS)
    function initialize(address admin, uint256 dailyRewardCapBps_) public initializer {
        __ERC20_init("StableToken", "STBL");
        __ERC20Permit_init("StableToken");
        __AccessControlDefaultAdminRules_init(1 days, admin);
        __UUPSUpgradeable_init();

        if (dailyRewardCapBps_ > MAX_DAILY_REWARD_CAP_BPS) {
            revert ExcessiveRewardCap(dailyRewardCapBps_, MAX_DAILY_REWARD_CAP_BPS);
        }

        dailyRewardCapBps = dailyRewardCapBps_;
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

    /// @notice Updates the reward recipient address
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param recipient The new reward recipient address (must not be zero)
    function setRewardRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert InvalidRewardRecipient();
        address oldRecipient = rewardRecipient;
        rewardRecipient = recipient;
        emit RewardRecipientUpdated(oldRecipient, recipient);
    }

    /// @notice Updates the daily reward cap
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param capBps The new daily reward cap in basis points (must not exceed MAX_DAILY_REWARD_CAP_BPS)
    function setDailyRewardCap(uint256 capBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (capBps > MAX_DAILY_REWARD_CAP_BPS) revert ExcessiveRewardCap(capBps, MAX_DAILY_REWARD_CAP_BPS);
        uint256 oldCapBps = dailyRewardCapBps;
        dailyRewardCapBps = capBps;
        emit DailyRewardCapUpdated(oldCapBps, capBps);
    }

    /// @notice Mints reward tokens to the configured reward recipient
    /// @dev Restricted to accounts with the REWARD_DISTRIBUTOR_ROLE. Subject to UTC-day boundary rate limiting.
    /// @param amount The amount of reward tokens to mint
    function mintReward(uint256 amount) external onlyRole(REWARD_DISTRIBUTOR_ROLE) {
        if (amount == 0) revert ZeroRewardAmount();
        if (rewardRecipient == address(0)) revert InvalidRewardRecipient();

        uint256 currentMinted = _currentMintedInPeriod();
        uint256 maxMint = totalSupply() * dailyRewardCapBps / 10_000;
        uint256 available = maxMint > currentMinted ? maxMint - currentMinted : 0;

        if (amount > available) revert ExceedsDailyRewardCap(amount, available);

        mintedInCurrentPeriod = currentMinted + amount;
        lastMintDay = block.timestamp / 86400;

        _mint(rewardRecipient, amount);
        emit RewardMinted(rewardRecipient, amount);
    }

    /// @notice Returns the amount of reward tokens currently available to mint
    /// @return The available reward mint amount based on total supply, cap, and decay
    function availableRewardMint() external view returns (uint256) {
        uint256 currentMinted = _currentMintedInPeriod();
        uint256 maxMint = totalSupply() * dailyRewardCapBps / 10_000;
        return maxMint > currentMinted ? maxMint - currentMinted : 0;
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract (unused but required by interface)
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @dev Returns the minted amount in the current UTC day, or 0 if a new day has started
    /// @return The minted amount for the current UTC day
    function _currentMintedInPeriod() internal view returns (uint256) {
        uint256 currentDay = block.timestamp / 86400;
        if (currentDay != lastMintDay) return 0;
        return mintedInCurrentPeriod;
    }
}
