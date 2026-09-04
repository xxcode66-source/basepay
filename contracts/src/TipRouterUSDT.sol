// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TipRouterUSDT
/// @notice Routes USDT tips using approve + transferFrom (no permit).
contract TipRouterUSDT is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    address public treasuryAddress;
    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_TIP_AMOUNT = 1;

    event TipSent(address indexed sender, address indexed streamer, uint256 totalAmount, uint256 feeAmount, uint256 streamerAmount);
    event TipAlert(address indexed sender, address indexed streamer, uint256 streamerAmount, string message);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error ZeroAddress();
    error AmountTooLow();
    error SelfTip();

    constructor(address _usdt, address _treasuryAddress, address _initialOwner) Ownable(_initialOwner) {
        if (_usdt == address(0) || _treasuryAddress == address(0) || _initialOwner == address(0)) revert ZeroAddress();
        usdt = IERC20(_usdt);
        treasuryAddress = _treasuryAddress;
    }

    function tip(address _streamer, uint256 _amount, string calldata _message)
        external nonReentrant whenNotPaused
    {
        if (_streamer == address(0)) revert ZeroAddress();
        if (_streamer == msg.sender) revert SelfTip();
        if (_amount < MIN_TIP_AMOUNT) revert AmountTooLow();

        uint256 feeAmount = (_amount * PLATFORM_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        uint256 streamerAmount = _amount - feeAmount;
        if (feeAmount > 0) usdt.safeTransferFrom(msg.sender, treasuryAddress, feeAmount);
        usdt.safeTransferFrom(msg.sender, _streamer, streamerAmount);
        emit TipSent(msg.sender, _streamer, _amount, feeAmount, streamerAmount);
        emit TipAlert(msg.sender, _streamer, streamerAmount, _message);
    }

    function setTreasuryAddress(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        address old = treasuryAddress;
        treasuryAddress = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    /// @notice Pause the contract in case of emergency. Only callable by owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract. Only callable by owner.
    function unpause() external onlyOwner {
        _unpause();
    }
}
