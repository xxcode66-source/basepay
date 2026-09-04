// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TipRouter} from "../src/TipRouter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    mapping(address => uint256) public nonces;
    bytes32 public immutable DOMAIN_SEPARATOR;

    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6);
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("USD Coin")), keccak256(bytes("2")), block.chainid, address(this)
        ));
    }

    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp <= deadline, "USDC: permit expired");
        uint256 nonce = nonces[owner]++;
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonce, deadline));
        address recovered = ecrecover(keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)), v, r, s);
        require(recovered == owner, "USDC: invalid signature");
        _approve(owner, spender, value);
    }
}

contract TipRouterTest is Test {
    TipRouter public router;
    MockUSDC public usdc;
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public streamer = makeAddr("streamer");
    uint256 public viewerPk = 0xA11CE;
    address public viewer;
    uint256 constant FIVE_USDC = 5_000_000;
    uint256 constant FEE_ON_FIVE = 250_000;

    function setUp() public {
        viewer = vm.addr(viewerPk);
        vm.prank(owner); usdc = new MockUSDC();
        router = new TipRouter(address(usdc), treasury, owner);
        vm.prank(owner); usdc.mint(viewer, 100 * 10 ** 6);
    }

    function _signPermit(uint256 value, uint256 nonce) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(abi.encode(usdc.PERMIT_TYPEHASH(), viewer, address(router), value, nonce, type(uint256).max));
        return vm.sign(viewerPk, keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash)));
    }

    function _tip(uint256 amount) internal {
        uint256 nonce = usdc.nonces(viewer);
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, nonce);
        vm.prank(viewer); router.tip(streamer, amount, type(uint256).max, nonce, v, r, s, "Test tip");
    }

    function test_TipSplitsCorrectly() public { _tip(FIVE_USDC); assertEq(usdc.balanceOf(treasury), FEE_ON_FIVE); assertEq(usdc.balanceOf(streamer), FIVE_USDC - FEE_ON_FIVE); }
    function test_FeeScalesWithAmount() public { _tip(10_000_000); assertEq(usdc.balanceOf(treasury), 500_000); }
    function test_SmallTipStillPaysFee() public { _tip(5); assertEq(usdc.balanceOf(treasury), 1); assertEq(usdc.balanceOf(streamer), 4); }
    function test_RevertWhen_AmountIsZero() public {
        vm.prank(viewer); vm.expectRevert(TipRouter.AmountTooLow.selector);
        router.tip(streamer, 0, type(uint256).max, 0, 0, bytes32(0), bytes32(0), "");
    }
    function test_RevertWhen_SelfTip() public {
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(FIVE_USDC, 0);
        vm.prank(viewer); vm.expectRevert(TipRouter.SelfTip.selector);
        router.tip(viewer, FIVE_USDC, type(uint256).max, 0, v, r, s, "");
    }
    function test_RevertWhen_InvalidSignature() public {
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(999, 0);
        vm.prank(viewer); vm.expectRevert(TipRouter.PermitFailed.selector);
        router.tip(streamer, FIVE_USDC, type(uint256).max, 0, v, r, s, "");
    }
    function test_OnlyOwnerCanUpdateTreasury() public {
        address nextTreasury = makeAddr("nextTreasury");
        vm.prank(viewer); vm.expectRevert(); router.setTreasuryAddress(nextTreasury);
        vm.prank(owner); router.setTreasuryAddress(nextTreasury);
        assertEq(router.treasuryAddress(), nextTreasury);
    }
}