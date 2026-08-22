// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TipRouter} from "../src/TipRouter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock USDC dengan 6 desimal, persis seperti USDC asli di Base.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TipRouterTest is Test {
    TipRouter public router;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public viewer = makeAddr("viewer");
    address public streamer = makeAddr("streamer");

    uint256 constant FIVE_USDC = 5_000_000; // $5.00
    uint256 constant FEE_ON_FIVE = 250_000; // 5% dari $5.00 = $0.25

    function setUp() public {
        vm.prank(owner);
        usdc = new MockUSDC();

        router = new TipRouter(address(usdc), treasury, owner);

        // Beri viewer saldo USDC untuk testing
        vm.prank(owner);
        usdc.mint(viewer, 100 * 10 ** 6);
    }

    function test_TipSplitsCorrectly() public {
        vm.startPrank(viewer);
        usdc.approve(address(router), FIVE_USDC);
        router.tip(streamer, FIVE_USDC);
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasury), FEE_ON_FIVE);
        assertEq(usdc.balanceOf(streamer), FIVE_USDC - FEE_ON_FIVE);
    }

    function test_FeeScalesWithAmount() public {
        uint256 tenUsdc = 10_000_000;
        vm.startPrank(viewer);
        usdc.approve(address(router), tenUsdc);
        router.tip(streamer, tenUsdc);
        vm.stopPrank();

        // 5% dari $10.00 = $0.50
        assertEq(usdc.balanceOf(treasury), 500_000);
        assertEq(usdc.balanceOf(streamer), tenUsdc - 500_000);
    }

    function test_RevertWhen_AmountIsZero() public {
        vm.startPrank(viewer);
        usdc.approve(address(router), 0);
        vm.expectRevert(TipRouter.AmountTooLow.selector);
        router.tip(streamer, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_StreamerIsZeroAddress() public {
        vm.startPrank(viewer);
        usdc.approve(address(router), FIVE_USDC);
        vm.expectRevert(TipRouter.ZeroAddress.selector);
        router.tip(address(0), FIVE_USDC);
        vm.stopPrank();
    }

    function test_RevertWhen_SelfTip() public {
        vm.startPrank(viewer);
        usdc.approve(address(router), FIVE_USDC);
        vm.expectRevert(TipRouter.SelfTip.selector);
        router.tip(viewer, FIVE_USDC);
        vm.stopPrank();
    }

    function test_RevertWhen_NoApproval() public {
        vm.startPrank(viewer);
        vm.expectRevert(); // ERC20InsufficientAllowance
        router.tip(streamer, FIVE_USDC);
        vm.stopPrank();
    }

    function test_OnlyOwnerCanUpdateTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(viewer);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        router.setTreasuryAddress(newTreasury);

        vm.prank(owner);
        router.setTreasuryAddress(newTreasury);
        assertEq(router.treasuryAddress(), newTreasury);
    }

    function test_SmallTipStillPaysFee() public {
        // 5 micro-USDC ($0.000005) — floor division would give fee = 0
        uint256 tinyAmount = 5;
        vm.startPrank(viewer);
        usdc.approve(address(router), tinyAmount);
        router.tip(streamer, tinyAmount);
        vm.stopPrank();

        // Ceiling division: ceil(5 * 500 / 10000) = ceil(0.25) = 1
        assertEq(usdc.balanceOf(treasury), 1);
        assertEq(usdc.balanceOf(streamer), tinyAmount - 1);
    }

    function test_RevertWhen_TreasuryIsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(TipRouter.ZeroAddress.selector);
        router.setTreasuryAddress(address(0));
    }
}
