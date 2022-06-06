import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers, upgrades } from 'hardhat';

import { setUpContract } from '../helpers';

chai.use(solidity);

describe('ArtistCreator upgrades', () => {
  describe('ArtistCreator.sol', async () => {
    it('prevents attackers from upgrading Artist beacon', async () => {
      const { miscAccounts, artistCreator } = await setUpContract();
      // Deploy v2 implementation
      const ArtistV2 = await ethers.getContractFactory('ArtistV2');
      const artistV2Impl = await ArtistV2.deploy();
      await artistV2Impl.deployed();
      for (const attacker of miscAccounts) {
        // upgrade beacon
        const beaconAddress = await artistCreator.beaconAddress();
        const beaconContract = await ethers.getContractAt('UpgradeableBeacon', beaconAddress, attacker);
        const beaconTx = beaconContract.upgradeTo(artistV2Impl.address);
        expect(beaconTx).to.be.revertedWith('Ownable: caller is not the owner');
      }
    });

    it('allows soundOwnerSigner to upgrade twice', async () => {
      const { artistCreator } = await setUpContract();

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
      const { artistCreator, miscAccounts } = await setUpContract();

      // deploy v2 ArtistCreator
      const ArtistCreator = await ethers.getContractFactory('ArtistCreator');
      const artistCreatorV2 = await ArtistCreator.deploy();
      await artistCreatorV2.deployed();

      const artistCreatorV1 = await ethers.getContractAt('ArtistCreator', artistCreator.address, miscAccounts[0]);
      const tx = artistCreatorV1.upgradeTo(artistCreatorV2.address);

      expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
