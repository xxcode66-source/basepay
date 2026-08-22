// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TipRouter
/// @notice Menerima tip USDC untuk live streamer di jaringan Base, memotong
///         fee platform 5% dan meneruskan sisanya langsung ke streamer.
///         Kontrak bersifat non-custodial: dana tidak pernah mampir/
///         tersimpan di dalam kontrak, hanya lewat sebagai routing.
/// @dev    USDC di Base menggunakan 6 desimal.
contract TipRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Token USDC yang digunakan (immutable, ditentukan saat deploy)
    IERC20 public immutable usdc;

    /// @notice Alamat treasury tujuan fee platform
    address public treasuryAddress;

    /// @notice Fee platform: 5% dari nominal tip, dinyatakan dalam basis
    ///         points (1 bps = 0.01%). 500 bps = 5%.
    uint256 public constant PLATFORM_FEE_BPS = 500;

    /// @notice Denominator basis points (10_000 bps = 100%)
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Jumlah tip minimum, sekadar mencegah tip senilai 0
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

    /// @param _usdc            Alamat kontrak USDC (Base mainnet atau Sepolia)
    /// @param _treasuryAddress Alamat awal penerima fee platform
    /// @param _initialOwner    Alamat owner kontrak (bisa multisig)
    constructor(address _usdc, address _treasuryAddress, address _initialOwner)
        Ownable(_initialOwner)
    {
        if (_usdc == address(0) || _treasuryAddress == address(0) || _initialOwner == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        treasuryAddress = _treasuryAddress;
    }

    /// @notice Kirim tip USDC ke seorang streamer.
    /// @dev    Pengirim harus sudah `approve()` kontrak ini untuk `_amount` USDC
    ///         sebelum memanggil fungsi ini.
    /// @param _streamer Alamat wallet streamer penerima
    /// @param _amount   Total nominal tip dalam unit USDC (6 desimal),
    ///                  termasuk fee platform di dalamnya.
    function tip(address _streamer, uint256 _amount) external nonReentrant {
        if (_streamer == address(0)) revert ZeroAddress();
        if (_streamer == msg.sender) revert SelfTip();
        if (_amount < MIN_TIP_AMOUNT) revert AmountTooLow();

        uint256 feeAmount = (_amount * PLATFORM_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        uint256 streamerAmount = _amount - feeAmount;

        // Dua transfer langsung dari sender — kontrak tidak pernah memegang dana.
        if (feeAmount > 0) {
            usdc.safeTransferFrom(msg.sender, treasuryAddress, feeAmount);
        }
        usdc.safeTransferFrom(msg.sender, _streamer, streamerAmount);

        emit TipSent(msg.sender, _streamer, _amount, feeAmount, streamerAmount);
    }

    /// @notice Update alamat treasury penerima fee. Hanya owner.
    function setTreasuryAddress(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        address old = treasuryAddress;
        treasuryAddress = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }
}
