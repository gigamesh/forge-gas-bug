// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.7;

import 'forge-std/Test.sol';
import '../contracts/ArtistCreator.sol';

contract TestConfig is Test {
    struct KeyPair {
        address publicAddress;
        uint256 privateKey;
    }

    ArtistCreator artistCreator;
    uint256 constant ADMIN_PRIV_KEY = 0xA11CE; // Alice private key
    uint256 constant NULL_PRIV_KEY = 0x0000000000000000000000000000000000000000000000000000000000000000;
    address public ADMIN_ADDRESS = vm.addr(ADMIN_PRIV_KEY);

    // Keys for mnemonic: clog doll trouble plug drill deny bottom into age task hybrid cement
    uint256[] public keyPairs = [
        0xb40fcf64c433d0f84762850777bec9895ad01499266b473cfbe545551a198e2d,
        0x2197db702d251e889adf7494263cd1ccf9cc430a3ccf427fd46aca318b7cf11d,
        0x43260195a9e66abd4003e285479a13c8dfac2bbbd107c2ef168fd6c3a45a7d0b,
        0x3c46e3a0d7a4ada20f6fa74e4879e4fa826efea2a3f3749455d76c96f38b6482,
        0x81369a61f39329b14b7e27097f65952703637763605a697708d42a8a9b6029b4,
        0x51dabd01892c442f1bc8b38795eb82620ce649b4e79fd9d2c566cb996eccc7d4,
        0xb13238f35660eb0e78b5d813d13d08ac611534b66e19ab63fdb84f77244b9c23,
        0xd938b247b9bb2064403de93826b71543839e18cf749c34c1105325d821d029c5,
        0xbd45df10b14200ee53f8c08b075ea1bfbd0178c8ccd183a8334d1275ed2849b8,
        0x8ffdfb2f035556dd1d0997e383697eaecc4dc283010b49ec2290b8c646b53b98,
        0x36ab811423a86fa91869c3d1d33ca35e8b7961dca4fcacf4a83bc3d9581ee4ae,
        0x6e10e26d6c6fc4a706ff0e639011b4a4a64cb89e27fd7a488b5e174ad7b4c9bc,
        0x217240432c93dec4003f232efcb5164ae09c537d14693a73d993f9a07a93540f,
        0x7d94af0f2fc23136c0e52b4d4dfc5b2625323f7a33b376067d7c6cbef3103646
    ];

    // Returns a random address funded with ETH
    function getRandomAccount(uint256 num) public returns (address) {
        address addr = address(uint160(uint256(keccak256(abi.encodePacked(num)))));
        // Fund with some ETH
        vm.deal(addr, 10000000000000000000);

        return addr;
    }

    // Set up before each test
    function setUp() public {
        vm.startPrank(vm.addr(ADMIN_PRIV_KEY));
        artistCreator = new ArtistCreator();
        artistCreator.initialize();
        vm.stopPrank();
    }

    // Creates auth signature needed for createArtist function
    // (equivalent to ethers.js wallet._signTypedData())
    function getCreateArtistSignature(address deployer) public returns (bytes memory signature) {
        // Build auth signature
        // (equivalent to ethers.js wallet._signTypedData())
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                artistCreator.DOMAIN_SEPARATOR(),
                keccak256(abi.encode(artistCreator.MINTER_TYPEHASH(), deployer))
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ADMIN_PRIV_KEY, digest);

        return abi.encodePacked(r, s, v);
    }
}
