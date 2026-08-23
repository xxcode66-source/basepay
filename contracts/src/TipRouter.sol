// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISignatureTransfer {
    struct TokenPermissions { address token; uint256 amount; }
    struct PermitTransferFrom { TokenPermissions permitted; uint256 nonce; uint256 deadline; }
    struct SignatureTransferDetails { address to; uint256 requestedAmount; }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

/// @title TipRouter
/// @notice Routes USDC tips through Uniswap Permit2 without holding user funds.
contract TipRouter is Ownable, ReentrancyGuard {
    address public immutable usdc;
    ISignatureTransfer public immutable permit2;
    address public treasuryAddress;

    uint256 public constant PLATFORM_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_TIP_AMOUNT = 1;

    event TipSent(
        address indexed sender,
        address indexed streamer,
        uint256 totalAmount,
        uint256 feeAmount,
        uint256 streamerAmount
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    error ZeroAddress();
    error AmountTooLow();
    error SelfTip();

    constructor(address _usdc, address _permit2, address _treasuryAddress, address _initialOwner)
        Ownable(_initialOwner)
    {
        if (
            _usdc == address(0) || _permit2 == address(0) || _treasuryAddress == address(0)
                || _initialOwner == address(0)
        ) revert ZeroAddress();

        usdc = _usdc;
        permit2 = ISignatureTransfer(_permit2);
        treasuryAddress = _treasuryAddress;
    }

    function tip(
        address _streamer,
        uint256 _amount,
        uint256 _feeNonce,
        uint256 _streamerNonce,
        uint256 _deadline,
        bytes calldata _feeSig,
        bytes calldata _streamerSig
    ) external nonReentrant {
        if (_streamer == address(0)) revert ZeroAddress();
        if (_streamer == msg.sender) revert SelfTip();
        if (_amount < MIN_TIP_AMOUNT) revert AmountTooLow();

        uint256 feeAmount = (_amount * PLATFORM_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        uint256 streamerAmount = _amount - feeAmount;

        permit2.permitTransferFrom(
            ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({token: usdc, amount: feeAmount}),
                nonce: _feeNonce,
                deadline: _deadline
            }),
            ISignatureTransfer.SignatureTransferDetails({to: treasuryAddress, requestedAmount: feeAmount}),
            msg.sender,
            _feeSig
        );
        permit2.permitTransferFrom(
            ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({token: usdc, amount: streamerAmount}),
                nonce: _streamerNonce,
                deadline: _deadline
            }),
            ISignatureTransfer.SignatureTransferDetails({to: _streamer, requestedAmount: streamerAmount}),
            msg.sender,
            _streamerSig
        );

        emit TipSent(msg.sender, _streamer, _amount, feeAmount, streamerAmount);
    }

    function setTreasuryAddress(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        address old = treasuryAddress;
        treasuryAddress = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }
}