// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {
    AccessControlDefaultAdminRulesUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IStableToken} from "./interfaces/IStableToken.sol";

/// @title Minter
/// @notice Allows users to deposit whitelisted stable USD collateral to mint StakeToken,
///         and redeem StakeToken for collateral
/// @dev Uses UUPS proxy pattern with AccessControlDefaultAdminRules and ReentrancyGuard
contract Minter is AccessControlDefaultAdminRulesUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint8 private constant TOKEN_DECIMALS = 18;

    IStableToken public stableToken;
    address public treasuryVault;
    EnumerableSet.AddressSet private _collateralTokens;
    mapping(address => uint8) private _collateralDecimals;

    // solhint-disable-next-line var-name-mixedcase
    uint256[45] private __gap;

    event CollateralTokenAdded(address indexed token);
    event CollateralTokenRemoved(address indexed token);
    event TreasuryVaultUpdated(address indexed oldVault, address indexed newVault);
    event Deposited(
        address indexed user, address indexed collateralToken, uint256 collateralAmount, uint256 tokenAmount
    );
    event Redeemed(
        address indexed user, address indexed collateralToken, uint256 tokenAmount, uint256 collateralAmount
    );
    event RedeemVaultDeposited(address indexed token, uint256 amount, address indexed depositor);
    event RedeemVaultWithdrawn(address indexed token, uint256 amount, address indexed to);

    error ZeroAddress();
    error ZeroAmount();
    error TokenNotWhitelisted(address token);
    error TokenAlreadyWhitelisted(address token);
    error TokenNotInWhitelist(address token);
    error InsufficientRedeemVaultBalance(address token, uint256 requested, uint256 available);
    error InvalidRedeemAmount();
    error CollateralDecimalsTooHigh(address token, uint8 decimals);
    error InvalidCollateralToken(address token);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the Minter contract
    /// @param token_ The token address to mint/burn (must support mint/burn via MINTER_ROLE)
    /// @param admin_ The address to be granted the default admin role
    /// @param treasuryVault_ The address where deposited collateral is forwarded
    function initialize(address token_, address admin_, address treasuryVault_) public initializer {
        if (token_ == address(0) || admin_ == address(0) || treasuryVault_ == address(0)) revert ZeroAddress();
        __AccessControlDefaultAdminRules_init(1 days, admin_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        stableToken = IStableToken(token_);
        treasuryVault = treasuryVault_;
    }

    /// @notice Adds a collateral token to the whitelist
    /// @param token The ERC20 token address to whitelist
    function addCollateralToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        if (token == address(stableToken)) revert InvalidCollateralToken(token);
        if (!_collateralTokens.add(token)) revert TokenAlreadyWhitelisted(token);
        uint8 tokenDecimals = IERC20Metadata(token).decimals();
        if (tokenDecimals > TOKEN_DECIMALS) revert CollateralDecimalsTooHigh(token, tokenDecimals);
        _collateralDecimals[token] = tokenDecimals;
        emit CollateralTokenAdded(token);
    }

    /// @notice Removes a collateral token from the whitelist
    /// @param token The ERC20 token address to remove
    function removeCollateralToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_collateralTokens.remove(token)) revert TokenNotInWhitelist(token);
        delete _collateralDecimals[token];
        emit CollateralTokenRemoved(token);
    }

    /// @notice Updates the treasury vault address
    /// @param newVault The new treasury vault address
    function setTreasuryVault(address newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newVault == address(0)) revert ZeroAddress();
        address oldVault = treasuryVault;
        treasuryVault = newVault;
        emit TreasuryVaultUpdated(oldVault, newVault);
    }

    /// @notice Admin deposits collateral into the redeem vault (this contract)
    /// @param token The collateral token to deposit
    /// @param amount The amount to deposit
    function depositToRedeemVault(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!_collateralTokens.contains(token)) revert TokenNotWhitelisted(token);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit RedeemVaultDeposited(token, amount, msg.sender);
    }

    /// @notice Admin withdraws collateral from the redeem vault
    /// @param token The collateral token to withdraw
    /// @param amount The amount to withdraw
    /// @param to The recipient address
    function withdrawFromRedeemVault(address token, uint256 amount, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientRedeemVaultBalance(token, amount, balance);
        IERC20(token).safeTransfer(to, amount);
        emit RedeemVaultWithdrawn(token, amount, to);
    }

    /// @notice Deposits collateral and mints StakeToken to the caller at 1:1 USD ratio
    /// @param collateralToken The whitelisted collateral token to deposit
    /// @param amount The amount of collateral in the token's native decimals
    function deposit(address collateralToken, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!_collateralTokens.contains(collateralToken)) revert TokenNotWhitelisted(collateralToken);

        IERC20(collateralToken).safeTransferFrom(msg.sender, treasuryVault, amount);

        uint256 mintAmount = _toTokenAmount(amount, _collateralDecimals[collateralToken]);
        stableToken.mint(msg.sender, mintAmount);

        emit Deposited(msg.sender, collateralToken, amount, mintAmount);
    }

    /// @notice Burns token and sends chosen collateral from the redeem vault to the caller
    /// @param collateralToken The whitelisted collateral token to receive
    /// @param tokenAmount The amount of token to burn (18 decimals)
    function redeem(address collateralToken, uint256 tokenAmount) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();
        if (!_collateralTokens.contains(collateralToken)) revert TokenNotWhitelisted(collateralToken);

        uint256 collateralAmount = _toCollateralAmount(tokenAmount, _collateralDecimals[collateralToken]);

        uint256 available = IERC20(collateralToken).balanceOf(address(this));
        if (available < collateralAmount) {
            revert InsufficientRedeemVaultBalance(collateralToken, collateralAmount, available);
        }

        stableToken.burn(msg.sender, tokenAmount);
        IERC20(collateralToken).safeTransfer(msg.sender, collateralAmount);

        emit Redeemed(msg.sender, collateralToken, tokenAmount, collateralAmount);
    }

    /// @notice Returns the list of all whitelisted collateral tokens
    function getCollateralTokens() external view returns (address[] memory) {
        return _collateralTokens.values();
    }

    /// @notice Checks if a token is whitelisted as collateral
    /// @param token The token address to check
    function isCollateralToken(address token) external view returns (bool) {
        return _collateralTokens.contains(token);
    }

    /// @notice Returns the redeem vault balance for a given token
    /// @param token The token address to query
    function getRedeemVaultBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function _toTokenAmount(uint256 collateralAmount, uint8 collateralDecimals) internal pure returns (uint256) {
        return collateralAmount * 10 ** (TOKEN_DECIMALS - collateralDecimals);
    }

    function _toCollateralAmount(uint256 tokenAmount, uint8 collateralDecimals) internal pure returns (uint256) {
        uint256 scalingFactor = 10 ** (TOKEN_DECIMALS - collateralDecimals);
        if (tokenAmount % scalingFactor != 0) revert InvalidRedeemAmount();
        return tokenAmount / scalingFactor;
    }

    /// @notice Authorizes a contract upgrade
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param newImplementation The address of the new implementation contract
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
