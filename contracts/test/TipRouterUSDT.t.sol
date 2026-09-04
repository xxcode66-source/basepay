// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TipRouterUSDT} from "../src/TipRouterUSDT.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TipRouterUSDTTest is Test {
    TipRouterUSDT public router;
    MockUSDT public usdt;
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public streamer = makeAddr("streamer");
    address public viewer = makeAddr("viewer");
    uint256 constant FIVE_USDT = 5_000_000;
    uint256 constant FEE_ON_FIVE = 250_000;

    function setUp() public {
        vm.prank(owner);
        usdt = new MockUSDT();
        router = new TipRouterUSDT(address(usdt), treasury, owner);
        usdt.mint(viewer, 100 * 10 ** 6);
    }

    function _tip(uint256 amount) internal {
        vm.prank(viewer);
        usdt.approve(address(router), amount);
        vm.prank(viewer);
        router.tip(streamer, amount, "Test tip");
    }

    function test_TipSplitsCorrectly() public {
        _tip(FIVE_USDT);
        assertEq(usdt.balanceOf(treasury), FEE_ON_FIVE);
        assertEq(usdt.balanceOf(streamer), FIVE_USDT - FEE_ON_FIVE);
    }

    function test_FeeScalesWithAmount() public {
        _tip(10_000_000);
        assertEq(usdt.balanceOf(treasury), 500_000);
    }

    function test_SmallTipStillPaysFee() public {
        _tip(5);
        assertEq(usdt.balanceOf(treasury), 1);
        assertEq(usdt.balanceOf(streamer), 4);
    }

    function test_RevertWhen_AmountIsZero() public {
        vm.prank(viewer);
        vm.expectRevert(TipRouterUSDT.AmountTooLow.selector);
        router.tip(streamer, 0, "");
    }

    function test_RevertWhen_SelfTip() public {
        vm.prank(viewer);
        usdt.approve(address(router), FIVE_USDT);
        vm.prank(viewer);
        vm.expectRevert(TipRouterUSDT.SelfTip.selector);
        router.tip(viewer, FIVE_USDT, "");
    }

    function test_RevertWhen_NoAllowance() public {
        vm.prank(viewer);
        vm.expectRevert();
        router.tip(streamer, FIVE_USDT, "");
    }

    function test_OnlyOwnerCanUpdateTreasury() public {
        address nextTreasury = makeAddr("nextTreasury");
        vm.prank(viewer);
        vm.expectRevert();
        router.setTreasuryAddress(nextTreasury);
        vm.prank(owner);
        router.setTreasuryAddress(nextTreasury);
        assertEq(router.treasuryAddress(), nextTreasury);
    }

    // ── Constructor Tests ────────────────────────────────────

    function test_RevertWhen_ConstructorZeroUSDT() public {
        vm.expectRevert(TipRouterUSDT.ZeroAddress.selector);
        new TipRouterUSDT(address(0), treasury, owner);
    }

    function test_RevertWhen_ConstructorZeroTreasury() public {
        vm.expectRevert(TipRouterUSDT.ZeroAddress.selector);
        new TipRouterUSDT(address(usdt), address(0), owner);
    }

    function test_RevertWhen_ConstructorZeroOwner() public {
        vm.expectRevert(TipRouterUSDT.ZeroAddress.selector);
        new TipRouterUSDT(address(usdt), treasury, address(0));
    }

    // ── Event Emission Tests ─────────────────────────────────

    function test_EmitsTreasuryUpdated() public {
        address nextTreasury = makeAddr("nextTreasury");
        vm.expectEmit(true, true, false, true);
        emit TipRouterUSDT.TreasuryUpdated(treasury, nextTreasury);
        vm.prank(owner);
        router.setTreasuryAddress(nextTreasury);
    }

    function test_EmitsTipSentAndAlert() public {
        vm.prank(viewer);
        usdt.approve(address(router), FIVE_USDT);
        vm.expectEmit(true, true, false, true);
        emit TipRouterUSDT.TipSent(viewer, streamer, FIVE_USDT, FEE_ON_FIVE, FIVE_USDT - FEE_ON_FIVE);
        vm.expectEmit(true, true, false, true);
        emit TipRouterUSDT.TipAlert(viewer, streamer, FIVE_USDT - FEE_ON_FIVE, "Hello");
        vm.prank(viewer);
        router.tip(streamer, FIVE_USDT, "Hello");
    }

    // ── Zero Address Streamer ────────────────────────────────

    function test_RevertWhen_StreamerZeroAddress() public {
        vm.prank(viewer);
        vm.expectRevert(TipRouterUSDT.ZeroAddress.selector);
        router.tip(address(0), FIVE_USDT, "");
    }

    // ── Pausable Tests ───────────────────────────────────────

    function test_PauseAndUnpause() public {
        vm.prank(owner);
        router.pause();
        assertTrue(router.paused());
        vm.prank(owner);
        router.unpause();
        assertFalse(router.paused());
    }

    function test_RevertWhen_TipWhilePaused() public {
        vm.prank(owner);
        router.pause();
        vm.prank(viewer);
        usdt.approve(address(router), FIVE_USDT);
        vm.prank(viewer);
        vm.expectRevert("Pausable: paused");
        router.tip(streamer, FIVE_USDT, "");
    }

    function test_RevertWhen_NonOwnerPause() public {
        vm.prank(viewer);
        vm.expectRevert();
        router.pause();
    }

    function test_RevertWhen_NonOwnerUnpause() public {
        vm.prank(owner);
        router.pause();
        vm.prank(viewer);
        vm.expectRevert();
        router.unpause();
    }

    function test_RevertWhen_SetTreasuryZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(TipRouterUSDT.ZeroAddress.selector);
        router.setTreasuryAddress(address(0));
    }
}
