// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @title IStakingVault
/// @notice Interface for the StakingVault staking contract
interface IStakingVault {
    struct RedemptionRequest {
        uint256 shares;
        uint256 unlockTime;
    }

    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event RedeemRequested(address indexed user, uint256 shares, uint256 unlockTime);
    event RedeemCompleted(address indexed user, uint256 shares, uint256 assets);
    event RedeemCancelled(address indexed user, uint256 shares);
    event RedemptionDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event DepositsPausedUpdated(bool paused);
    event RedemptionsPausedUpdated(bool paused);

    error ZeroAmount();
    error ZeroAddress();
    error BelowMinimumDeposit();
    error DepositsPaused();
    error RedemptionsPaused();
    error RedemptionNotReady();
    error NoRedemptionRequest();
    error PendingRedemptionExists();
    error InsufficientUnlockedBalance();
    error InsufficientBalance();
    error ExcessiveDelay();

    /// @notice Deposits stable tokens and mints vault shares to the caller
    /// @param assets The amount of stable tokens to deposit
    /// @return shares The amount of vault shares minted
    function deposit(uint256 assets) external returns (uint256 shares);

    /// @notice Requests a redemption of vault shares
    /// @param shares The amount of shares to redeem
    function requestRedeem(uint256 shares) external;

    /// @notice Completes a pending redemption after the delay period
    /// @return assets The amount of stable tokens returned
    function completeRedeem() external returns (uint256 assets);

    /// @notice Cancels a pending redemption request
    function cancelRedeem() external;

    /// @notice Returns the total amount of stable tokens held by the vault
    /// @return The total assets in the vault
    function totalAssets() external view returns (uint256);

    /// @notice Returns the current price per share
    /// @return The share price scaled by PRICE_PRECISION
    function sharePrice() external view returns (uint256);

    /// @notice Previews the amount of shares that would be minted for a given deposit
    /// @param assets The amount of stable tokens to deposit
    /// @return shares The amount of shares that would be minted
    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    /// @notice Previews the amount of assets that would be returned for a given redemption
    /// @param shares The amount of shares to redeem
    /// @return assets The amount of stable tokens that would be returned
    function previewRedeem(uint256 shares) external view returns (uint256 assets);

    /// @notice Returns the redemption delay in seconds
    /// @return The redemption delay
    function redemptionDelay() external view returns (uint256);

    /// @notice Returns the stable token address
    /// @return The stable token contract
    function stableToken() external view returns (address);

    /// @notice Returns the redemption request for a given user
    /// @param user The address to query
    /// @return The redemption request
    function getRedemptionRequest(address user) external view returns (RedemptionRequest memory);

    /// @notice Returns the amount of locked shares for a given user
    /// @param user The address to query
    /// @return The amount of locked shares
    function lockedShares(address user) external view returns (uint256);
}
