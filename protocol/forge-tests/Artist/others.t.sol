// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.14;

import {IERC2981Upgradeable} from '@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol';
import '../TestConfig.sol';

contract Artist_others is TestConfig {
    event SignerAddressSet(uint256 editionId, address indexed signerAddress);
    event PermissionedQuantitySet(uint256 editionId, uint32 permissionedQuantity);
    event BaseURISet(uint256 editionId, string baseURI);

    /***********************************
            setSignerAddress
    ***********************************/

    // setSignerAddress only allows owner or admin to call function
    function test_setSignerAddressOnlyOwner() public {
        createEdition(1);

        // Attempting to call function before connecting as the owner or admin
        vm.expectRevert(bytes('unauthorized'));
        artistContract.setSignerAddress(EDITION_ID, address(123));
    }

    // setSignerAddress prevents attempt to set null address
    function test_setSignerAddressRevertOnNullAddress() public {
        createEdition(1);

        vm.expectRevert(bytes('Signer address cannot be 0'));

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setSignerAddress(EDITION_ID, address(0));
    }

    // setSignerAddress sets a new signer address for the edition
    function test_setSignerAddressSuccess() public {
        createEdition(1);

        address newSigner = address(123);

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setSignerAddress(EDITION_ID, newSigner);

        (, , , , , , , , address signer, ) = artistContract.editions(EDITION_ID);

        assertEq(signer, newSigner);
    }

    // setSignerAddress emits event
    function test_setSignerAddressEmitsEvent() public {
        createEdition(1);

        address newSigner = address(123);

        vm.expectEmit(true, false, false, true);
        emit SignerAddressSet(EDITION_ID, newSigner);

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setSignerAddress(EDITION_ID, newSigner);
    }

    /***********************************
            setPermissionedQuantity
    ***********************************/

    // setPermissionedQuantity only allows owner or admin to call function
    function test_setPermissionedQuantityOnlyOwner() public {
        createEdition(1);

        // Attempting to call function before connecting as the owner or admin
        vm.expectRevert(bytes('unauthorized'));
        artistContract.setPermissionedQuantity(EDITION_ID, 123);
    }

    // setPermissionedQuantity prevents attempt to set permissioned quantity when there is no signer address
    function test_setPermissionedQuantityRevertOnNoSignerAddress() public {
        vm.prank(ARTIST1_ADDRESS);
        artistContract.createEdition(
            payable(FUNDING_RECIPIENT),
            PRICE,
            QUANTITY,
            ROYALTY_BPS,
            START_TIME,
            END_TIME,
            PERMISSIONED_QUANTITY,
            address(0), // creating edition with no signer
            EDITION_ID,
            ''
        );

        vm.expectRevert(bytes('Edition must have a signer'));

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setPermissionedQuantity(EDITION_ID, 123);
    }

    // setPermissionedQuantity sets a new permissioned quantity for the edition
    function test_setPermissionedQuantity() public {
        createEdition(1);

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setPermissionedQuantity(EDITION_ID, 123);

        (, , , , , , , uint32 permissionedQuantity, , ) = artistContract.editions(EDITION_ID);

        assertEq(permissionedQuantity, 123);
    }

    // setPermissionedQuantity emits event
    function test_setPermissionedQuantityEmitsEvent() public {
        createEdition(1);

        uint32 newPermissionedQuantity = 54321;

        vm.expectEmit(true, false, false, true);
        emit PermissionedQuantitySet(EDITION_ID, newPermissionedQuantity);

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setPermissionedQuantity(EDITION_ID, newPermissionedQuantity);
    }

    /***********************************
            setEditionBaseURI
    ***********************************/

    // setEditionBaseURI only allows owner to call function
    function test_setEditionBaseURIOnlyOwner() public {
        createEdition(1);

        // Attempting to call function before connecting as the owner
        vm.expectRevert(bytes('unauthorized'));
        artistContract.setEditionBaseURI(EDITION_ID, 'http://example.com/');
    }

    // setEditionBaseURI reverts on non-existent edition
    function test_setEditionBaseURIRevertsIfNonExistentEdition() public {
        vm.expectRevert(bytes('Nonexistent edition'));

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setEditionBaseURI(EDITION_ID, 'http://example.com/');
    }

    // setEditionBaseURI sets the edition baseURI
    function setEditionBaseURISuccess() public {
        createEdition(1);

        string memory newBaseURI = 'http://example.com/';

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setEditionBaseURI(EDITION_ID, newBaseURI);

        (, , , , , , , , , string memory baseURI) = artistContract.editions(EDITION_ID);

        assertEq(baseURI, newBaseURI);
    }

    // tokenURI continues to use default baseURI if edition.baseURI is equal to or less than 3 chars (ex: artist accidentally sets to empty spaces)
    function test_setEditionBaseURIContinuesToUseDefaultBaseURI() public {
        uint32[] memory tokensPerBuyer = new uint32[](1);
        tokensPerBuyer[0] = 1;

        createEditionAndBuyTokens(BUYERS, tokensPerBuyer);

        string memory newBaseURI = '   ';

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setEditionBaseURI(EDITION_ID, newBaseURI);

        uint256 tokenId = (EDITION_ID << 128) | 1;
        string memory baseURI = artistContract.tokenURI(tokenId);
        string memory artistContractAddrAsString = Strings.toHexString(uint256(uint160(address(artistContract))), 20);

        assertEq(baseURI, string.concat(BASE_URI, artistContractAddrAsString, '/', Strings.toString(tokenId)));
    }

    // setEditionBaseURI emits event data
    function test_setEditionBaseURIEmitsEvent() public {
        createEdition(1);

        string memory newBaseURI = 'http://example.com/';

        vm.expectEmit(true, false, false, true);
        emit BaseURISet(EDITION_ID, newBaseURI);

        vm.prank(ARTIST1_ADDRESS);
        artistContract.setEditionBaseURI(EDITION_ID, newBaseURI);
    }

    /***********************************
            editionCount
    ***********************************/

    // editionCount returns the correct number of editions
    function test_editionCount() public {
        uint256 numOfEditions = 10;

        for (uint256 editionId = 1; editionId <= numOfEditions; editionId++) {
            vm.prank(ARTIST1_ADDRESS);
            artistContract.createEdition(
                payable(FUNDING_RECIPIENT),
                PRICE,
                QUANTITY,
                ROYALTY_BPS,
                START_TIME,
                END_TIME,
                PERMISSIONED_QUANTITY,
                SIGNER_ADDRESS,
                editionId,
                ''
            );
        }

        assertEq(artistContract.editionCount(), numOfEditions);
    }

    /***********************************
            ownersOfTokenIds
    ***********************************/

    // ownerOsfTokenIds returns the correct list of owners
    function test_ownersOfTokenIdsSuccess() public {
        uint32[] memory tokensPerBuyer = new uint32[](1);
        tokensPerBuyer[0] = 1;

        uint256 numOfTokensToBuy = 10;

        uint256[] memory tokenIds = new uint256[](numOfTokensToBuy);

        for (uint256 i = 0; i < numOfTokensToBuy; i++) {
            tokenIds[i] = (EDITION_ID << 128) | (i + 1);
        }

        createEditionAndBuyTokens(BUYERS, tokensPerBuyer);
        address[] memory owners = artistContract.ownersOfTokenIds(tokenIds);

        for (uint256 i = 0; i < numOfTokensToBuy; i++) {
            assertEq(owners[i], BUYERS[i]);
        }
    }

    // reverts when passed a nonexistent token
    function test_ownersOfTokenIdsRevertsIfNonExistentToken() public {
        vm.expectRevert(bytes('ERC721: owner query for nonexistent token'));

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = (EDITION_ID << 128) | 1;

        vm.prank(ARTIST1_ADDRESS);
        artistContract.ownersOfTokenIds(tokenIds);
    }

    /***********************************
            checkTicketNumbers
    ***********************************/

    // checkTicketNumbers returns correct list of booleans corresponding to a given list of claimed or unclaimed ticket numbers
    function test_checkTicketNumbersSuccess() public {
        uint32[] memory tokensPerBuyer = new uint32[](1);
        tokensPerBuyer[0] = 1;

        uint32 numOfTokensToBuy = 50;

        uint256[] memory ticketNumbers = new uint256[](numOfTokensToBuy * 2);
        bool[] memory expectedClaimedAndUnclaimed = new bool[](numOfTokensToBuy * 2);

        // Create edition as presale
        vm.prank(ARTIST1_ADDRESS);
        artistContract.createEdition(
            payable(FUNDING_RECIPIENT),
            PRICE,
            numOfTokensToBuy, // quantity
            ROYALTY_BPS,
            uint32(block.timestamp + 10000), // start time
            END_TIME,
            numOfTokensToBuy, // permissionedQuantity
            SOUND_ADMIN_ADDRESS, // signer
            EDITION_ID,
            ''
        );

        // For each ticket number, buy a token, store the ticket number as claimed (true),
        // then add an unclaimed ticket number so we can test the response from checkTicketNumbers alternates as true and false
        uint256 index = 0;
        for (uint256 ticketNum = 0; ticketNum < numOfTokensToBuy; ticketNum++) {
            address buyer = BUYERS[ticketNum];

            bytes memory signature = getPresaleSignature(artistContract, ADMIN_PRIV_KEY, buyer, EDITION_ID, ticketNum);

            // Buy token
            vm.prank(buyer);
            artistContract.buyEdition{value: PRICE}(EDITION_ID, signature, ticketNum);

            // Store ticket number as claimed
            ticketNumbers[index] = ticketNum;
            expectedClaimedAndUnclaimed[index] = true;

            index++;

            // Add unclaimed ticket number
            ticketNumbers[index] = ticketNum + numOfTokensToBuy;
            expectedClaimedAndUnclaimed[index] = false;

            index++;
        }

        bool[] memory claimedAndUnclaimed = artistContract.checkTicketNumbers(EDITION_ID, ticketNumbers);

        for (uint256 i = 0; i < numOfTokensToBuy; i++) {
            assertEq(claimedAndUnclaimed[i], expectedClaimedAndUnclaimed[i]);
        }
    }

    /***********************************
            setOwnerOverride
    ***********************************/

    // Sound recovery address can transfer ownership of artist contract using setOwnerOverride
    function test_setSoundOverrideSuccess() public {
        address newArtistWallet = vm.addr(987654321);

        vm.prank(SOUND_ADMIN_ADDRESS);
        artistContract.setOwnerOverride(newArtistWallet);

        assertEq(artistContract.owner(), newArtistWallet);
    }

    // setOwnerOverride reverts if called by any address that isn't the owner (artist) or address returned from soundRecoveryAddress
    function test_setSoundOverrideRevert(address attacker) public {
        vm.assume(attacker != artistContract.owner());

        vm.expectRevert(bytes('unauthorized'));
        vm.prank(attacker);
        artistContract.setOwnerOverride(attacker);
    }
}
