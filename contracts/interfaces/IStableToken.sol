// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @title IStableToken
/// @notice Interface for token mint/burn and reward operations used by the Minter contract
interface IStableToken {
    event RewardMinted(address indexed recipient, uint256 amount);
    event RewardRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event DailyRewardCapUpdated(uint256 oldCapBps, uint256 newCapBps);

    error ExceedsDailyRewardCap(uint256 requested, uint256 available);
    error InvalidRewardRecipient();
    error ExcessiveRewardCap(uint256 capBps, uint256 maxCapBps);
    error ZeroRewardAmount();

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;

    function mintReward(uint256 amount) external;
    function availableRewardMint() external view returns (uint256);
    function setRewardRecipient(address recipient) external;
    function setDailyRewardCap(uint256 capBps) external;
    function rewardRecipient() external view returns (address);
    function dailyRewardCapBps() external view returns (uint256);
}
