// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TipRouter} from "../src/TipRouter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") { _mint(msg.sender, 1_000_000 * 10 ** 6); }
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockPermit2 {
    bytes32 public constant TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");
    bytes32 public constant PERMIT_TRANSFER_FROM_TYPEHASH = keccak256(
        "PermitTransferFrom(TokenPermissions permitted,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
    );
    bytes32 public immutable DOMAIN_SEPARATOR;
    mapping(address => mapping(uint256 => uint256)) public nonceBitmap;

    struct TokenPermissions { address token; uint256 amount; }
    struct PermitTransferFrom { TokenPermissions permitted; uint256 nonce; uint256 deadline; }
    struct SignatureTransferDetails { address to; uint256 requestedAmount; }

    constructor() {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("Permit2")), block.chainid, address(this)
        ));
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata details,
        address owner,
        bytes calldata signature
    ) external {
        require(block.timestamp <= permit.deadline, "permit2: permit expired");
        uint256 wordPos = permit.nonce >> 8;
        uint256 bitPos = permit.nonce & 255;
        require(nonceBitmap[owner][wordPos] & (1 << bitPos) == 0, "permit2: nonce used");

        bytes32 permissionsHash = keccak256(abi.encode(
            TOKEN_PERMISSIONS_TYPEHASH, permit.permitted.token, permit.permitted.amount
        ));
        bytes32 permitHash = keccak256(abi.encode(
            PERMIT_TRANSFER_FROM_TYPEHASH, permissionsHash, permit.nonce, permit.deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, permitHash));
        (uint8 v, bytes32 r, bytes32 s) = _splitSignature(signature);
        require(ecrecover(digest, v, r, s) == owner, "permit2: invalid signature");
        require(details.requestedAmount <= permit.permitted.amount, "permit2: amount too high");

        nonceBitmap[owner][wordPos] |= 1 << bitPos;
        require(ERC20(permit.permitted.token).transferFrom(owner, details.to, details.requestedAmount), "permit2: transfer failed");
    }

    function _splitSignature(bytes calldata sig) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65, "permit2: invalid sig length");
        assembly { r := calldataload(sig.offset) s := calldataload(add(sig.offset, 0x20)) v := byte(0, calldataload(add(sig.offset, 0x40))) }
    }
}

contract TipRouterTest is Test {
    TipRouter public router;
    MockUSDC public usdc;
    MockPermit2 public permit2;
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public streamer = makeAddr("streamer");
    uint256 public viewerPk = 0xA11CE;
    address public viewer;
    uint256 constant FIVE_USDC = 5_000_000;

    function setUp() public {
        viewer = vm.addr(viewerPk);
        vm.prank(owner); usdc = new MockUSDC();
        permit2 = new MockPermit2();
        router = new TipRouter(address(usdc), address(permit2), treasury, owner);
        vm.prank(owner); usdc.mint(viewer, 100 * 10 ** 6);
        vm.prank(viewer); usdc.approve(address(permit2), type(uint256).max);
    }

    function _signPermit(uint256 amount, uint256 nonce) internal view returns (bytes memory) {
        bytes32 permissionsHash = keccak256(abi.encode(permit2.TOKEN_PERMISSIONS_TYPEHASH(), address(usdc), amount));
        bytes32 permitHash = keccak256(abi.encode(permit2.PERMIT_TRANSFER_FROM_TYPEHASH(), permissionsHash, nonce, type(uint256).max));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(viewerPk, keccak256(abi.encodePacked("\x19\x01", permit2.DOMAIN_SEPARATOR(), permitHash)));
        return abi.encodePacked(r, s, v);
    }

    function _tip(uint256 amount, uint256 feeNonce, uint256 streamerNonce) internal {
        uint256 fee = (amount * 500 + 9_999) / 10_000;
        bytes memory feeSig = _signPermit(fee, feeNonce);
        bytes memory streamerSig = _signPermit(amount - fee, streamerNonce);
        vm.prank(viewer);
        router.tip(streamer, amount, feeNonce, streamerNonce, type(uint256).max, feeSig, streamerSig);
    }

    function test_TipSplitsCorrectly() public {
        _tip(FIVE_USDC, 0, 1);
        assertEq(usdc.balanceOf(treasury), 250_000);
        assertEq(usdc.balanceOf(streamer), 4_750_000);
    }

    function test_FeeScalesWithAmount() public { _tip(10_000_000, 2, 3); assertEq(usdc.balanceOf(treasury), 500_000); }
    function test_SmallTipStillPaysFee() public { _tip(5, 4, 5); assertEq(usdc.balanceOf(treasury), 1); assertEq(usdc.balanceOf(streamer), 4); }
    function test_RevertWhen_AmountIsZero() public {
        vm.prank(viewer); vm.expectRevert(TipRouter.AmountTooLow.selector);
        router.tip(streamer, 0, 0, 1, type(uint256).max, "", "");
    }
    function test_RevertWhen_SelfTip() public {
        uint256 fee = 250_000;
        bytes memory feeSig = _signPermit(fee, 6);
        bytes memory streamerSig = _signPermit(FIVE_USDC - fee, 7);
        vm.prank(viewer); vm.expectRevert(TipRouter.SelfTip.selector);
        router.tip(viewer, FIVE_USDC, 6, 7, type(uint256).max, feeSig, streamerSig);
    }
    function test_OnlyOwnerCanUpdateTreasury() public {
        address nextTreasury = makeAddr("nextTreasury");
        vm.prank(viewer); vm.expectRevert(); router.setTreasuryAddress(nextTreasury);
        vm.prank(owner); router.setTreasuryAddress(nextTreasury);
        assertEq(router.treasuryAddress(), nextTreasury);
    }
}