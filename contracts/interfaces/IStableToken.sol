// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/// @title IStableToken
/// @notice Interface for token mint/burn operations used by the Minter contract
interface IStableToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}
