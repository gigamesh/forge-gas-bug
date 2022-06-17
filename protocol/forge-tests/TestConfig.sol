// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.14;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '../contracts/ArtistCreatorProxy.sol';
import '../contracts/ArtistCreator.sol';
import '../contracts/ArtistCreatorV3.sol';
import '../contracts/ArtistV6.sol';

contract TestConfig is Test {
    struct KeyPair {
        address publicAddress;
        uint256 privateKey;
    }

    ArtistCreatorV3 artistCreator;

    // Keys for mnemonic: clog doll trouble plug drill deny bottom into age task hybrid cement
    uint256[] public privateKeys = [
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

    uint256 constant NULL_PRIV_KEY = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes constant EMPTY_SIGNATURE = bytes('');
    uint256 immutable ADMIN_PRIV_KEY;
    address immutable SOUND_ADMIN_ADDRESS;
    address payable immutable ARTIST1_ADDRESS;
    address payable immutable ARTIST2_ADDRESS;
    address payable immutable FUNDING_RECIPIENT;
    address[8] BUYERS = [
        (vm.addr(3)),
        (vm.addr(4)),
        (vm.addr(5)),
        (vm.addr(6)),
        (vm.addr(7)),
        (vm.addr(8)),
        (vm.addr(9)),
        (vm.addr(10))
    ];

    // default edition args
    uint256 immutable PRICE;
    uint32 immutable QUANTITY;
    uint32 immutable ROYALTY_BPS;
    uint32 immutable START_TIME;
    uint32 immutable END_TIME;
    uint32 immutable PERMISSIONED_QUANTITY;
    address immutable SIGNER_ADDRESS;
    uint256 immutable EDITION_ID;
    string constant BASE_URI = 'https://metadata.sound.xyz/';

    constructor() {
        ADMIN_PRIV_KEY = privateKeys[0];
        SOUND_ADMIN_ADDRESS = vm.addr(ADMIN_PRIV_KEY);
        ARTIST1_ADDRESS = payable(vm.addr(privateKeys[1]));
        ARTIST2_ADDRESS = payable(vm.addr(privateKeys[2]));
        FUNDING_RECIPIENT = ARTIST1_ADDRESS;
        PRICE = 1 ether;
        QUANTITY = 10;
        ROYALTY_BPS = 1000;
        START_TIME = 0;
        END_TIME = 2**32 - 1;
        PERMISSIONED_QUANTITY = 0;
        EDITION_ID = 1;
        SIGNER_ADDRESS = SOUND_ADMIN_ADDRESS;

        // Give each buyer some ETH
        for (uint8 i; i < BUYERS.length; i++) {
            deal(BUYERS[i], 10000 ether);
        }
    }

    // Returns a random address funded with ETH
    function getRandomAccount(uint256 num) public returns (address) {
        address addr = address(uint160(uint256(keccak256(abi.encodePacked(num)))));
        // Fund with some ETH
        vm.deal(addr, 10000000000000000000);

        return addr;
    }

    // Set up before each test
    function setUp() public {
        vm.startPrank(SOUND_ADMIN_ADDRESS);

        // Deploy proxy & V1 implementation
        address proxy = address(
            ArtistCreator(address(new ArtistCreatorProxy(address(new ArtistCreator()), address(0), bytes(''))))
        );

        // Initialize proxy
        ArtistCreator(proxy).initialize();

        // Deploy latest ArtistCreator implemenation
        address creatorImplementation = address(new ArtistCreatorV3());

        // Upgrade creator
        ArtistCreator(proxy).upgradeTo(creatorImplementation);

        // Store proxy
        artistCreator = ArtistCreatorV3(address(proxy));

        // Deploy latest Artist implementation
        address artistImplementation = address(new ArtistV6());

        // Get beacon for upgrade
        address beaconAddress = ArtistCreator(proxy).beaconAddress();
        UpgradeableBeacon beacon = UpgradeableBeacon(beaconAddress);

        // Upgrade to latest Artist implementation
        beacon.upgradeTo(artistImplementation);

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
