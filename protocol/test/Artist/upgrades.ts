import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { constants, helpers } from '@soundxyz/common';
import chai, { expect } from 'chai';
import { BigNumber, Contract, utils } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers, upgrades, waffle } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import {
  BASE_URI,
  createArtist,
  currentSeconds,
  EMPTY_SIGNATURE,
  EXAMPLE_ARTIST_NAME,
  EXAMPLE_ARTIST_SYMBOL,
  getRandomBN,
  getTokenId,
  MAX_UINT32,
  NULL_ADDRESS,
  createEdition,
  EditionArgs,
} from '../helpers';

chai.use(solidity);

enum TimeType {
  START = 0,
  END = 1,
}

type CustomMintArgs = {
  quantity?: BigNumber;
  price?: BigNumber;
  startTime?: BigNumber;
  endTime?: BigNumber;
  editionCount?: number;
  royaltyBPS?: BigNumber;
  fundingRecipient?: SignerWithAddress;
};

const { provider } = waffle;
const { getPresaleSignature } = helpers;
const { baseURIs } = constants;
const chainId = 1337;
const EDITION_ID = '1';

describe('Artist upgrades', () => {
  let artistCreator: Contract;
  let soundOwnerSigner: SignerWithAddress;
  let artistAccount: SignerWithAddress;
  let recipientSigner: SignerWithAddress;
  let fundingRecipient: SignerWithAddress;
  let miscSigners: SignerWithAddress[];
  let price: BigNumber;
  let quantity: BigNumber;
  let royaltyBPS: BigNumber;
  let startTime: BigNumber;
  let endTime: BigNumber;

  const setUp = async (customConfig: CustomMintArgs = {}) => {
    [soundOwnerSigner, artistAccount, recipientSigner, ...miscSigners] = await ethers.getSigners();

    const ArtistCreator = await ethers.getContractFactory('ArtistCreator');
    artistCreator = await upgrades.deployProxy(ArtistCreator, { kind: 'uups' });
    await artistCreator.deployed();

    const tx = await createArtist(artistCreator, artistAccount, EXAMPLE_ARTIST_NAME, EXAMPLE_ARTIST_SYMBOL, BASE_URI);

    const receipt = await tx.wait();
    const preUpgradeProxyAddress = receipt.events.find((e) => e.event === 'CreatedArtist').args.artistAddress;
    const preUpgradeProxy = await ethers.getContractAt(`Artist`, preUpgradeProxyAddress, artistAccount);

    const editionCount = customConfig.editionCount ?? 1;
    fundingRecipient = customConfig.fundingRecipient || recipientSigner;
    price = customConfig.price || parseEther('0.1');
    quantity = customConfig.quantity || getRandomBN();
    royaltyBPS = customConfig.royaltyBPS || BigNumber.from(0);
    startTime = customConfig.startTime || BigNumber.from(0x0); // default to start of unix epoch
    endTime = customConfig.endTime || BigNumber.from(MAX_UINT32);

    // Create some editions
    await createEditions(preUpgradeProxy, editionCount);

    return preUpgradeProxy;
  };

  const upgradeArtistImplementation = async ({
    contractVersion,
    preUpgradeProxy,
  }: {
    contractVersion: string;
    preUpgradeProxy?: Contract;
  }) => {
    // Deploy v2 artist implementation
    const ArtistNewVersion = await ethers.getContractFactory(contractVersion);
    const artistNewImpl = await ArtistNewVersion.deploy();
    await artistNewImpl.deployed();

    // Upgrade beacon
    const beaconAddress = await artistCreator.beaconAddress();
    const beaconContract = await ethers.getContractAt('UpgradeableBeacon', beaconAddress, soundOwnerSigner);
    const beaconTx = await beaconContract.upgradeTo(artistNewImpl.address);
    await beaconTx.wait();

    // If preUpgradeProxy is provided, return its upgraded instantiation
    if (preUpgradeProxy) {
      return await ethers.getContractAt(contractVersion, preUpgradeProxy.address, artistAccount);
    }
  };

  const deployArtistProxyPostUpgrade = async (artistVersionName: string) => {
    // Deploy upgraded proxy
    const createArtistTx = await createArtist(
      artistCreator,
      artistAccount,
      EXAMPLE_ARTIST_NAME,
      EXAMPLE_ARTIST_SYMBOL,
      BASE_URI
    );
    const receipt = await createArtistTx.wait();
    const proxyAddress = receipt.events.find((e) => e.event === 'CreatedArtist').args.artistAddress;

    // Instantiate proxy
    return await ethers.getContractAt(artistVersionName, proxyAddress, artistAccount);
  };

  //================== Artist.sol ==================/

  describe('Artist.sol -> ArtistV2.sol', () => {
    describe('Artist proxy deployed before upgrade', () => {
      it('existing storage data remains intact', async () => {
        const preUpgradeProxy = await setUp();

        /// Purchase something before the upgrade to compare numSold
        const tx = await preUpgradeProxy.buyEdition(EDITION_ID, { value: price });
        await tx.wait();
        const preUpgradeEditionInfo = await preUpgradeProxy.editions(EDITION_ID);

        // Perform upgrade
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });

        const postUpgradeEditionInfo = await upgradedProxy.editions(EDITION_ID);

        expect(postUpgradeEditionInfo.numSold).to.equal(preUpgradeEditionInfo.numSold);
        expect(postUpgradeEditionInfo.quantity).to.equal(preUpgradeEditionInfo.quantity);
        expect(postUpgradeEditionInfo.startTime).to.equal(preUpgradeEditionInfo.startTime);
        expect(postUpgradeEditionInfo.endTime).to.equal(preUpgradeEditionInfo.endTime);
        expect(postUpgradeEditionInfo.royaltyBPS).to.equal(preUpgradeEditionInfo.royaltyBPS);
        expect(postUpgradeEditionInfo.price.toString()).to.equal(preUpgradeEditionInfo.price.toString());
        expect(postUpgradeEditionInfo.fundingRecipient).to.equal(preUpgradeEditionInfo.fundingRecipient);
      });

      it('storage includes new variables', async () => {
        const preUpgradeProxy = await setUp();
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });
        expect(await upgradedProxy.PRESALE_TYPEHASH()).is.not.undefined;
      });

      it('returns correct royalty from royaltyInfo (fixes bug in v1)', async () => {
        const royaltyBPS = BigNumber.from(69);
        const saleAmount = utils.parseUnits('1.0', 'ether');

        const preUpgradeProxy = await setUp({ editionCount: 0 });

        const edition1Tx = await createEdition({
          artistContract: preUpgradeProxy,
          artistAccount,
          editionArgs: [fundingRecipient.address, price, quantity, royaltyBPS, startTime, endTime],
        });
        await edition1Tx.wait();

        const buy1Tx = await preUpgradeProxy.buyEdition(1, { value: price });
        await buy1Tx.wait();
        const buy2Tx = await preUpgradeProxy.buyEdition(1, { value: price });
        await buy2Tx.wait();

        // At this point, there are 2 tokens bought from edition 1.
        // Calling royaltyInfo(2) should return nothing because editionId 2 hasn't been created.
        const royaltyInfoPreUpgrade = await preUpgradeProxy.royaltyInfo(2, saleAmount);

        // Verify pre-upgrade royaltyInfo is null
        expect(royaltyInfoPreUpgrade.fundingRecipient).to.equal('0x0000000000000000000000000000000000000000');
        expect(royaltyInfoPreUpgrade.royaltyAmount).to.equal(BigNumber.from(0));

        // Perform upgrade
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });

        // Calling royaltyInfo(2) should return data because royaltyInfo is now fixed and tokenId 2 has been created.
        const royaltyInfoPostUpgrade = await upgradedProxy.royaltyInfo(2, saleAmount);

        // Verify post-upgrade royaltyInfo is correct
        const expectedRoyalty = saleAmount.mul(royaltyBPS).div(10_000);
        expect(royaltyInfoPostUpgrade.fundingRecipient).to.equal(fundingRecipient.address);
        expect(royaltyInfoPostUpgrade.royaltyAmount).to.equal(expectedRoyalty);
      });

      it('emits event from setStartTime', async () => {
        const preUpgradeProxy = await setUp();
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });
        await setStartTimeTest(upgradedProxy);
      });

      it('emits event from setEndTime', async () => {
        const preUpgradeProxy = await setUp();
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });
        await setEndTimeTest(upgradedProxy);
      });

      it('requires signature for presale purchases', async () => {
        const preUpgradeProxy = await setUp({ editionCount: 0 });
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });
        await rejectPresalePurchaseTest(upgradedProxy);
      });

      it('sells open sale NFTs', async () => {
        const preUpgradeProxy = await setUp();
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV2', preUpgradeProxy });
        await openSalePurchaseTest(upgradedProxy);
      });

      it('sells NFTs of v1 editions after an upgrade', async () => {
        const preUpgradeProxy = await setUp();

        await preUpgradeProxy.buyEdition(EDITION_ID, { value: price });

        const upgradedProxy = await upgradeArtistImplementation({
          contractVersion: 'ArtistV2',
          preUpgradeProxy,
        });

        const tx = await upgradedProxy.buyEdition(EDITION_ID, EMPTY_SIGNATURE, { value: price });
        const receipt = await tx.wait();
        const totalSupply = await upgradedProxy.totalSupply();

        expect(receipt.status).to.equal(1);
        expect(totalSupply.toNumber()).to.equal(2);
      });
    });

    describe('Artist proxy deployed after upgrade', () => {
      it('returns correct royalty from royaltyInfo (fixes bug in v1)', async () => {
        await setUp({ editionCount: 0 });
        await upgradeArtistImplementation({ contractVersion: 'ArtistV2' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV2');

        const edition1Royalty = BigNumber.from(69);
        const saleAmount = utils.parseUnits('1.0', 'ether');

        const presaleQuantity = 1;
        const signerAddress = soundOwnerSigner.address;
        const editionTx = await createEdition({
          artistContract: postUpgradeProxy,
          artistAccount,
          editionArgs: [
            fundingRecipient.address,
            price,
            quantity,
            edition1Royalty,
            startTime,
            endTime,
            presaleQuantity,
            signerAddress,
          ],
        });
        await editionTx.wait();

        const signers = await ethers.getSigners();
        const buyer = signers[10];

        const signature = await getPresaleSignature({
          chainId,
          provider,
          editionId: EDITION_ID,
          privateKey: process.env.ADMIN_PRIVATE_KEY,
          contractAddress: postUpgradeProxy.address,
          buyerAddress: buyer.address,
        });

        const buy1Tx = await postUpgradeProxy.connect(buyer).buyEdition(1, signature, { value: price });
        await buy1Tx.wait();
        const buy2Tx = await postUpgradeProxy.connect(buyer).buyEdition(1, signature, { value: price });
        await buy2Tx.wait();

        const royaltyInfo = await postUpgradeProxy.royaltyInfo(2, saleAmount);

        const expectedRoyalty = saleAmount.mul(edition1Royalty).div(10_000);

        // If the upgrade didn't work, royaltyInfo(2) would return null values because only one edition was created.
        expect(royaltyInfo.fundingRecipient).to.equal(fundingRecipient.address);
        expect(royaltyInfo.royaltyAmount).to.equal(expectedRoyalty);
      });

      it('emits event from setStartTime', async () => {
        await setUp();
        await upgradeArtistImplementation({ contractVersion: 'ArtistV2' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV2');
        await setStartTimeTest(postUpgradeProxy);
      });

      it('emits event from setEndTime', async () => {
        await setUp();
        await upgradeArtistImplementation({ contractVersion: 'ArtistV2' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV2');
        await setEndTimeTest(postUpgradeProxy);
      });

      it('requires signature for presale purchases', async () => {
        await setUp({ editionCount: 0 });
        await upgradeArtistImplementation({ contractVersion: 'ArtistV2' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV2');
        await rejectPresalePurchaseTest(postUpgradeProxy);
      });

      it('sells open sale NFTs', async () => {
        await setUp();
        await upgradeArtistImplementation({ contractVersion: 'ArtistV2' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV2');
        await openSalePurchaseTest(postUpgradeProxy);
      });
    });
  });

  describe('ArtistV2.sol -> ArtistV3.sol', () => {
    describe('Artist proxy deployed before upgrade', () => {
      it('returns expected tokenURI', async () => {
        const editionCount = 5;
        const preUpgradeProxy = await setUp({ editionCount });
        await tokenURITest(preUpgradeProxy, editionCount);
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV3', preUpgradeProxy });
        await tokenURITest(upgradedProxy, editionCount);
      });

      it('returns expected totalSupply', async () => {
        const editionCount = 5;
        const tokenQuantity = 10;
        const preUpgradeProxy = await setUp({ editionCount });
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV3', preUpgradeProxy });
        await totalSupplyTest(upgradedProxy, editionCount, tokenQuantity);
      });

      it('returns expected edition id from tokenToEdition', async () => {
        const editionCount = 5;
        const tokenQuantity = 10;
        const preUpgradeProxy = await setUp({ editionCount });

        // Create and buy editions before upgrade
        for (let currentEditionId = 1; currentEditionId <= editionCount; currentEditionId++) {
          for (let tokenSerialNum = 1; tokenSerialNum <= tokenQuantity; tokenSerialNum++) {
            // Buy token of edition
            await preUpgradeProxy.buyEdition(currentEditionId, { value: price });
          }
        }

        // perform upgrade
        await upgradeArtistImplementation({ contractVersion: 'ArtistV3' });

        // Check data after upgrade
        let tokenId = 0;
        for (let currentEditionId = 1; currentEditionId <= editionCount; currentEditionId++) {
          for (let tokenSerialNum = 1; tokenSerialNum <= tokenQuantity; tokenSerialNum++) {
            tokenId++;

            const editionId = await preUpgradeProxy.tokenToEdition(tokenId);

            expect(editionId.toNumber()).to.equal(currentEditionId);
          }
        }
      });

      it('can withdraw ETH after upgrade', async () => {
        const preUpgradeProxy = await setUp();
        const initialBalance = await provider.getBalance(fundingRecipient.address);

        await preUpgradeProxy.buyEdition(EDITION_ID, { value: price });

        await upgradeArtistImplementation({ contractVersion: 'ArtistV3' });

        await preUpgradeProxy.withdrawFunds(EDITION_ID);

        const postUpgradeBalance = await provider.getBalance(fundingRecipient.address);

        expect(initialBalance.add(price).toString()).to.equal(postUpgradeBalance.toString());
      });

      it('sends ETH to funding recipient from buy edition transactions after upgrade', async () => {
        const preUpgradeProxy = await setUp();
        const initialBalance = await provider.getBalance(fundingRecipient.address);

        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV3', preUpgradeProxy });

        const price = parseUnits('42');

        await upgradedProxy.buyEdition(EDITION_ID, EMPTY_SIGNATURE, { value: price });

        const postBuyBalance = await provider.getBalance(fundingRecipient.address);

        expect(initialBalance.add(price).toString()).to.equal(postBuyBalance.toString());
      });
    });

    describe('Artist proxy deployed after upgrade', () => {
      it('returns expected tokenURI', async () => {
        const editionCount = 5;
        await setUp({ editionCount });
        await upgradeArtistImplementation({ contractVersion: 'ArtistV3' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV3');
        await tokenURITest(postUpgradeProxy, editionCount, true);
      });

      it('returns expected totalSupply', async () => {
        const editionCount = 5;
        const tokenQuantity = 10;
        await setUp({ editionCount });
        await upgradeArtistImplementation({ contractVersion: 'ArtistV3' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV3');
        await totalSupplyTest(postUpgradeProxy, editionCount, tokenQuantity, true);
      });

      it('returns expected edition id from tokenToEdition', async () => {
        const editionCount = 5;
        const tokenQuantity = 10;
        await setUp();
        await upgradeArtistImplementation({ contractVersion: 'ArtistV3' });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV3');

        await createEditions(postUpgradeProxy, editionCount, true);

        for (let currentEditionId = 1; currentEditionId <= editionCount; currentEditionId++) {
          for (let tokenSerialNum = 1; tokenSerialNum <= tokenQuantity; tokenSerialNum++) {
            // Buy token of edition
            await postUpgradeProxy.buyEdition(currentEditionId, EMPTY_SIGNATURE, { value: price });

            const tokenId = getTokenId(currentEditionId, tokenSerialNum);
            const editionId = await postUpgradeProxy.tokenToEdition(tokenId);

            expect(editionId.toNumber()).to.equal(currentEditionId);
          }
        }
      });
    });
  });

  describe('ArtistV3.sol -> ArtistV4.sol', () => {
    describe('Artist proxy deployed before upgrade', () => {
      it('can sell an edition before and after upgrade', async () => {
        const preUpgradeProxy = await setUp();

        const signers = await ethers.getSigners();
        const buyer = signers[10];

        await preUpgradeProxy.buyEdition(EDITION_ID, { value: price });

        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV4', preUpgradeProxy });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV4');

        const startTime = BigNumber.from(currentSeconds() + 999999);
        const presaleQuantity = quantity;
        const signerAddress = soundOwnerSigner.address;
        const editionTx = await createEdition({
          artistContract: postUpgradeProxy,
          artistAccount,
          editionArgs: [
            fundingRecipient.address,
            price,
            quantity,
            royaltyBPS,
            startTime,
            endTime,
            presaleQuantity,
            signerAddress,
          ],
        });
        await editionTx.wait();

        const ticketNumber = '0';
        const signature = await getPresaleSignature({
          chainId,
          provider,
          editionId: EDITION_ID,
          privateKey: process.env.ADMIN_PRIVATE_KEY,
          contractAddress: postUpgradeProxy.address,
          buyerAddress: buyer.address,
          ticketNumber,
        });

        const tx = await upgradedProxy.buyEdition(EDITION_ID, signature, ticketNumber, { value: price });
        const receipt = await tx.wait();
        const editionInfo = await upgradedProxy.editions(EDITION_ID);

        expect(editionInfo.numSold).to.equal(2);
        expect(receipt.status).to.equal(1);
      });

      it('can create and sell an open edition after upgrade', async () => {
        const preUpgradeProxy = await setUp();
        const upgradedProxy = await upgradeArtistImplementation({ contractVersion: 'ArtistV4', preUpgradeProxy });
        const postUpgradeProxy = await deployArtistProxyPostUpgrade('ArtistV4');

        const startTime = BigNumber.from(currentSeconds() + 999999);
        const quantity = 5;
        const presaleQuantity = quantity * 2;
        const signerAddress = soundOwnerSigner.address;
        const editionTx = await createEdition({
          artistContract: postUpgradeProxy,
          artistAccount,
          editionArgs: [
            fundingRecipient.address,
            price,
            quantity,
            royaltyBPS,
            startTime,
            endTime,
            presaleQuantity,
            signerAddress,
          ],
        });
        await editionTx.wait();

        for (let i = 1; i <= presaleQuantity; i++) {
          const ticketNumber = i;
          const currentBuyer = miscSigners[i];
          const signature = await getPresaleSignature({
            chainId,
            provider,
            editionId: EDITION_ID,
            privateKey: process.env.ADMIN_PRIVATE_KEY,
            contractAddress: postUpgradeProxy.address,
            buyerAddress: currentBuyer.address,
            ticketNumber: ticketNumber.toString(),
          });

          const tx = await upgradedProxy.buyEdition(EDITION_ID, signature, ticketNumber, { value: price });
          const receipt = await tx.wait();
          const editionInfo = await upgradedProxy.editions(EDITION_ID);

          expect(editionInfo.numSold).to.equal(i);
          expect(receipt.status).to.equal(1);
        }
      });
    });
  });

  //================== REUSABLE TESTS ==================/

  const setStartTimeTest = async (artistContract: Contract) => {
    const newTime = 1743324758;

    const tx = await artistContract.setStartTime(EDITION_ID, newTime);
    const receipt = await tx.wait();

    const { args } = artistContract.interface.parseLog(receipt.events[0]);
    expect(args.newTime).to.equal(newTime);
    expect(args.timeType).to.equal(TimeType.START);
  };

  const setEndTimeTest = async (artistContract: Contract) => {
    const newTime = 1843325072;

    const tx = await artistContract.setEndTime(EDITION_ID, newTime);
    const receipt = await tx.wait();

    const { args } = artistContract.interface.parseLog(receipt.events[0]);
    expect(args.newTime).to.equal(newTime);
    expect(args.timeType).to.equal(TimeType.END);
  };

  const rejectPresalePurchaseTest = async (artistContract: Contract) => {
    const startTime = BigNumber.from(Math.floor(Date.now() / 1000) + 999999);
    const presaleQuantity = 1;
    const signerAddress = soundOwnerSigner.address;
    const editionTx = await createEdition({
      artistContract,
      artistAccount,
      editionArgs: [
        fundingRecipient.address,
        price,
        quantity,
        royaltyBPS,
        startTime,
        endTime,
        presaleQuantity,
        signerAddress,
      ],
    });
    await editionTx.wait();

    const tx = artistContract.buyEdition(EDITION_ID, EMPTY_SIGNATURE, { value: price });

    await expect(tx).to.be.revertedWith('ECDSA: invalid signature');
  };

  const openSalePurchaseTest = async (artistContract: Contract) => {
    const startTime = BigNumber.from(0);
    const presaleQuantity = 0;
    const signerAddress = soundOwnerSigner.address;
    const editionTx = await createEdition({
      artistContract,
      artistAccount,
      editionArgs: [
        fundingRecipient.address,
        price,
        quantity,
        royaltyBPS,
        startTime,
        endTime,
        presaleQuantity,
        signerAddress,
      ],
    });
    await editionTx.wait();

    const tx = await artistContract.buyEdition(EDITION_ID, EMPTY_SIGNATURE, { value: price });
    const receipt = await tx.wait();

    expect(receipt.status).to.equal(1);
  };

  const tokenURITest = async (artistContract: Contract, editionCount: number, isPostUpgradeProxy?: boolean) => {
    for (let editionId; editionId < editionCount; editionId++) {
      const tokenSerialNum = 1;

      // Buy token of edition
      await artistContract.buyEdition(editionId, EMPTY_SIGNATURE, { value: price });
      const tokenId = isPostUpgradeProxy ? getTokenId(EDITION_ID, tokenSerialNum) : tokenSerialNum;
      const tokenURI = await artistContract.tokenURI(tokenId);

      expect(tokenURI).to.equal(`${baseURIs.hardhat}${EDITION_ID}/${tokenSerialNum}`);
    }
  };

  const totalSupplyTest = async (
    artistContract: Contract,
    editionCount: number,
    quantity: number,
    isPostUpgradeProxy?: boolean
  ) => {
    if (isPostUpgradeProxy) {
      await createEditions(artistContract, editionCount, true);
    }

    for (let editionId = 1; editionId <= editionCount; editionId++) {
      for (let tokenSerialNum = 1; tokenSerialNum <= quantity; tokenSerialNum++) {
        // Buy token of edition
        await artistContract.buyEdition(editionId, EMPTY_SIGNATURE, { value: price });
      }
    }
    const totalSupply = await artistContract.totalSupply();

    expect(totalSupply.toNumber()).to.equal(editionCount * quantity);
  };

  const createEditions = async (artistContract: Contract, editionCount: number, postV2?: boolean) => {
    const editionArgs: EditionArgs = [fundingRecipient.address, price, quantity, royaltyBPS, startTime, endTime];

    if (postV2) {
      editionArgs.push(0); // presaleQuantity
      editionArgs.push(NULL_ADDRESS); // signerAddress
    }

    for (let i = 0; i < editionCount; i++) {
      await createEdition({ artistContract, artistAccount, editionArgs });
    }
  };
});
