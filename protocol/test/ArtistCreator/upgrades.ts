import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import chai, { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { ethers, upgrades } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import {
  BASE_URI,
  createArtist,
  EXAMPLE_ARTIST_NAME,
  EXAMPLE_ARTIST_SYMBOL,
  getRandomBN,
  MAX_UINT32,
  NULL_ADDRESS,
  createEdition,
  EditionArgs,
} from '../helpers';

chai.use(solidity);

type CustomMintArgs = {
  quantity?: BigNumber;
  price?: BigNumber;
  startTime?: BigNumber;
  endTime?: BigNumber;
  editionCount?: number;
  royaltyBPS?: BigNumber;
  fundingRecipient?: SignerWithAddress;
};

describe('AristCreator upgrades', () => {
  let artistCreator: Contract;
  let soundOwnerSigner: SignerWithAddress;
  let artistAccount: SignerWithAddress;
  let recipientSigner: SignerWithAddress;
  let fundingRecipient: SignerWithAddress;
  let miscSigners: SignerWithAddress[];
  let artistPreUpgradeProxy: Contract;
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
    const artistPreUpgradeProxyAddress = receipt.events[3].args.artistAddress;
    artistPreUpgradeProxy = await ethers.getContractAt(`Artist`, artistPreUpgradeProxyAddress, artistAccount);

    const editionCount = customConfig.editionCount ?? 1;
    fundingRecipient = customConfig.fundingRecipient || recipientSigner;
    price = customConfig.price || parseEther('0.1');
    quantity = customConfig.quantity || getRandomBN();
    royaltyBPS = customConfig.royaltyBPS || BigNumber.from(0);
    startTime = customConfig.startTime || BigNumber.from(0x0); // default to start of unix epoch
    endTime = customConfig.endTime || BigNumber.from(MAX_UINT32);

    // Create some editions
    await createEditions(artistPreUpgradeProxy, editionCount);
  };

  //================== ArtistCreator.sol ==================/

  describe('ArtistCreator.sol', async () => {
    it('prevents attackers from upgrading Artist beacon', async () => {
      await setUp();
      // Deploy v2 implementation
      const ArtistV2 = await ethers.getContractFactory('ArtistV2');
      const artistV2Impl = await ArtistV2.deploy();
      await artistV2Impl.deployed();
      for (const attacker of miscSigners) {
        // upgrade beacon
        const beaconAddress = await artistCreator.beaconAddress();
        const beaconContract = await ethers.getContractAt('UpgradeableBeacon', beaconAddress, attacker);
        const beaconTx = beaconContract.upgradeTo(artistV2Impl.address);
        expect(beaconTx).to.be.revertedWith('Ownable: caller is not the owner');
      }
    });

    it('allows soundOwnerSigner to upgrade twice', async () => {
      await setUp();

      const ArtistCreator = await ethers.getContractFactory('ArtistCreator');
      const artistCreatorV2 = await upgrades.upgradeProxy(artistCreator.address, ArtistCreator);
      await artistCreatorV2.deployed();

      const ArtistCreatorV3Test = await ethers.getContractFactory('ArtistCreatorUpgradeTest');
      const artistCreatorV3 = await upgrades.upgradeProxy(artistCreator.address, ArtistCreatorV3Test);
      await artistCreatorV3.deployed();

      const v3testFuncResponse = await artistCreatorV3.testFunction();
      expect(v3testFuncResponse.toString()).to.equal('666');
    });

    it('prevents attacker from upgrading', async () => {
      await setUp();

      // deploy v2 ArtistCreator
      const ArtistCreator = await ethers.getContractFactory('ArtistCreator');
      const artistCreatorV2 = await ArtistCreator.deploy();
      await artistCreatorV2.deployed();

      const artistCreatorV1 = await ethers.getContractAt('ArtistCreator', artistCreator.address, miscSigners[0]);
      const tx = artistCreatorV1.upgradeTo(artistCreatorV2.address);

      expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  //================== REUSABLE TESTS ==================/

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
