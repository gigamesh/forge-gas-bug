// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.14;

import {IERC2981Upgradeable} from '@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol';
import '../TestConfig.sol';

contract Artist_deployment is TestConfig {
    // Deploys contract with basic attributes
    function test_deploysArtist() public {
        string memory name = artistContract.name();
        string memory symbol = artistContract.symbol();

        assertEq(name, ARTIST_NAME);
        assertEq(symbol, ARTIST_SYMBOL);
    }

    // Supports EIP-2981 royalty standard
    function test_2981RoyaltySupport() public view {
        assert(artistContract.supportsInterface(type(IERC2981Upgradeable).interfaceId));
    }

    // ownerOf reverts if called for non-existent tokens
    function test_ownerOfRevertsForNonExistentTokens(uint256 tokenId) public {
        vm.expectRevert(bytes('ERC721: owner query for nonexistent token'));
        artistContract.ownerOf(tokenId);
    }

    // tokenURI reverts if called for non-existent tokens
    function test_tokenURIRevertsForNonExistentTokens(uint256 tokenId) public {
        vm.expectRevert(bytes('ERC721Metadata: URI query for nonexistent token'));
        artistContract.tokenURI(tokenId);
    }

    // balanceOf returns 0 for addresses without a balance
    function test_balanceOf() public {
        for (uint256 i = 0; i < BUYERS.length; i++) {
            uint256 balance = artistContract.balanceOf(BUYERS[i]);

            assertEq(balance, 0);
        }
    }
}
