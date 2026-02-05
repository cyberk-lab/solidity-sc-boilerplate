// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
    ERC20PermitUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {
    AccessControlDefaultAdminRulesUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStakingVault} from "./interfaces/IStakingVault.sol";

/// @title StakingVault
/// @notice A vault that accepts stable token deposits and issues shares representing a proportional claim on the vault
/// @dev Uses UUPS proxy pattern with ERC20 shares, time-locked redemptions, and virtual offset for inflation protection
contract StakingVault is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ReentrancyGuardUpgradeable,
    AccessControlDefaultAdminRulesUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 private constant VIRTUAL_SHARES = 1e3;
    uint256 private constant VIRTUAL_ASSETS = 1;
    uint256 private constant MIN_FIRST_DEPOSIT = 1e6;
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant MAX_REDEMPTION_DELAY = 30 days;

    IERC20 public stableToken;
    uint256 public redemptionDelay;
    bool public depositsPaused;
    bool public redemptionsPaused;
    mapping(address => IStakingVault.RedemptionRequest) private _redemptionRequests;
    mapping(address => uint256) public lockedShares;

    // solhint-disable-next-line var-name-mixedcase
    uint256[40] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the StakingVault contract
    /// @param stableToken_ The stable token accepted for deposits
    /// @param admin_ The address to be granted the default admin role
    /// @param redemptionDelay_ The delay in seconds before a redemption can be completed
    function initialize(address stableToken_, address admin_, uint256 redemptionDelay_) public initializer {
        if (stableToken_ == address(0) || admin_ == address(0)) revert IStakingVault.ZeroAddress();
        __ERC20_init("Staked StableToken", "sSTBL");
        __ERC20Permit_init("Staked StableToken");
        __AccessControlDefaultAdminRules_init(1 days, admin_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        stableToken = IERC20(stableToken_);
        redemptionDelay = redemptionDelay_;
    }

    /// @notice Returns the total amount of stable tokens held by the vault
    /// @return The total assets in the vault
    function totalAssets() public view returns (uint256) {
        return stableToken.balanceOf(address(this));
    }

    /// @notice Returns the current price per share scaled by PRICE_PRECISION
    /// @dev Uses virtual offset to align with actual conversion math
    /// @return The share price
    function sharePrice() public view returns (uint256) {
        return ((totalAssets() + VIRTUAL_ASSETS) * PRICE_PRECISION) / (totalSupply() + VIRTUAL_SHARES);
    }

    /// @notice Previews the amount of shares that would be minted for a given deposit
    /// @param assets The amount of stable tokens to deposit
    /// @return The amount of shares that would be minted
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return _convertToShares(assets);
    }

    /// @notice Previews the amount of assets that would be returned for a given redemption
    /// @param shares The amount of shares to redeem
    /// @return The amount of stable tokens that would be returned
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return _convertToAssets(shares);
    }

    /// @notice Deposits stable tokens and mints vault shares to the caller
    /// @param assets The amount of stable tokens to deposit
    /// @return shares The amount of vault shares minted
    function deposit(uint256 assets) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert IStakingVault.ZeroAmount();
        if (depositsPaused) revert IStakingVault.DepositsPaused();
        if (totalSupply() == 0 && assets < MIN_FIRST_DEPOSIT) revert IStakingVault.BelowMinimumDeposit();

        shares = _convertToShares(assets);
        if (shares == 0) revert IStakingVault.ZeroAmount();

        stableToken.safeTransferFrom(msg.sender, address(this), assets);
        _mint(msg.sender, shares);

        emit IStakingVault.Deposited(msg.sender, assets, shares);
    }

    /// @notice Requests a redemption of vault shares subject to a time-lock delay
    /// @param shares The amount of shares to redeem
    function requestRedeem(uint256 shares) external nonReentrant {
        if (shares == 0) revert IStakingVault.ZeroAmount();
        if (redemptionsPaused) revert IStakingVault.RedemptionsPaused();
        if (balanceOf(msg.sender) - lockedShares[msg.sender] < shares) revert IStakingVault.InsufficientBalance();
        if (_redemptionRequests[msg.sender].shares != 0) revert IStakingVault.PendingRedemptionExists();

        lockedShares[msg.sender] += shares;
        uint256 unlockTime = block.timestamp + redemptionDelay;
        _redemptionRequests[msg.sender] = IStakingVault.RedemptionRequest(shares, unlockTime);

        emit IStakingVault.RedeemRequested(msg.sender, shares, unlockTime);
    }

    /// @notice Completes a pending redemption after the delay period has elapsed
    /// @return assets The amount of stable tokens returned to the caller
    function completeRedeem() external nonReentrant returns (uint256 assets) {
        if (redemptionsPaused) revert IStakingVault.RedemptionsPaused();

        IStakingVault.RedemptionRequest memory request = _redemptionRequests[msg.sender];
        if (request.shares == 0) revert IStakingVault.NoRedemptionRequest();
        if (block.timestamp < request.unlockTime) revert IStakingVault.RedemptionNotReady();

        uint256 shares = request.shares;
        assets = _convertToAssets(shares);
        if (assets == 0) revert IStakingVault.ZeroAmount();

        delete _redemptionRequests[msg.sender];
        lockedShares[msg.sender] -= shares;

        _burn(msg.sender, shares);
        stableToken.safeTransfer(msg.sender, assets);

        emit IStakingVault.RedeemCompleted(msg.sender, shares, assets);
    }

    /// @notice Cancels a pending redemption request and unlocks the shares
    function cancelRedeem() external {
        IStakingVault.RedemptionRequest memory request = _redemptionRequests[msg.sender];
        if (request.shares == 0) revert IStakingVault.NoRedemptionRequest();

        uint256 shares = request.shares;
        delete _redemptionRequests[msg.sender];
        lockedShares[msg.sender] -= shares;

        emit IStakingVault.RedeemCancelled(msg.sender, shares);
    }

    /// @notice Returns the redemption request for a given user
    /// @param user The address to query
    /// @return The redemption request details
    function getRedemptionRequest(address user) external view returns (IStakingVault.RedemptionRequest memory) {
        return _redemptionRequests[user];
    }

    /// @notice Sets the redemption delay period
    /// @param newDelay The new delay in seconds
    function setRedemptionDelay(uint256 newDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newDelay > MAX_REDEMPTION_DELAY) revert IStakingVault.ExcessiveDelay();
        uint256 oldDelay = redemptionDelay;
        redemptionDelay = newDelay;
        emit IStakingVault.RedemptionDelayUpdated(oldDelay, newDelay);
    }

    /// @notice Pauses or unpauses deposits
    /// @param paused Whether deposits should be paused
    function setDepositsPaused(bool paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        depositsPaused = paused;
        emit IStakingVault.DepositsPausedUpdated(paused);
    }

    /// @notice Pauses or unpauses redemptions
    /// @param paused Whether redemptions should be paused
    function setRedemptionsPaused(bool paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        redemptionsPaused = paused;
        emit IStakingVault.RedemptionsPausedUpdated(paused);
    }

    function _convertToShares(uint256 assets) internal view returns (uint256) {
        if (totalSupply() == 0) return assets;
        return (assets * (totalSupply() + VIRTUAL_SHARES)) / (totalAssets() + VIRTUAL_ASSETS);
    }

    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return (shares * (totalAssets() + VIRTUAL_ASSETS)) / (totalSupply() + VIRTUAL_SHARES);
    }

    /// @dev Prevents transfers of locked shares
    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0)) {
            if (balanceOf(from) - lockedShares[from] < amount) revert IStakingVault.InsufficientUnlockedBalance();
        }
        super._update(from, to, amount);
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
