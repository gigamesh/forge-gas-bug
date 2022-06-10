import { constants } from '@soundxyz/common';
import { task } from 'hardhat/config';

const { baseURIs } = constants;

task('verifyContract', 'Verify a contract')
  .addParam('name', 'The name of the contract')
  .addParam('address', 'The address of the contract to verify')
  // .addOptionalParam('artistVersion', 'Artist.sol version number')
  .addOptionalParam(
    'contract',
    `The contract's path. ex: If verifying an Artist proxy, use @openzeppelin/contracts/proxy/beacon/BeaconProxy.sol:BeaconProxy`
  )
  .setAction(async (args, hardhat) => {
    const { ethers, run, deployments } = hardhat;
    const { name, address, contract, artistVersion } = args;
    const [deployer] = await ethers.getSigners();

    // if (name.toLowerCase().includes('artist') && name !== 'ArtistCreator' && !artistVersion) {
    //   throw Error(`Must provide a version number. ex: --name ArtistV3 --artist-version 3`);
    // }

    console.log({ name, address, contract });

    // const artistCreator = await ethers.getContract('ArtistCreator');
    // let beaconAddress = await artistCreator.beaconAddress();

    let constructorArgs = [];
    // if (name === 'BeaconProxy') {
    //   const baseURI = baseURIs[hardhat.network.name];
    //   const argsForArtistInit = [
    //     '0xB0A36b3CeDf210f37a5E7BC28d4b8E91D4E3C412', // rinkeby deployer address
    //     '0',
    //     `Sound.xyz ArtistV${args.artistVersion}.sol`,
    //     `SOUND V${args.artistVersion}`,
    //     baseURI,
    //   ];
    //   const artistArtifact = await deployments.getArtifact(`ArtistV${artistVersion}`);
    //   const iface = new ethers.utils.Interface(artistArtifact.abi);
    //   const functionSelector = iface.encodeFunctionData('initialize', argsForArtistInit);
    //   constructorArgs = [beaconAddress, functionSelector];
    // }

    // const constructorArgs = ['0x3a866C8ac5c20247d6814d5F31Ff809c6b8D6Eac', deployer.address, '0x'];

    const options: any = {
      address: address,
      constructorArguments: constructorArgs,
    };

    if (contract) {
      // ex: contracts/ArtistCreatorProxy.sol:ArtistCreatorProxy
      options.contract = contract;
    }

    console.log(options);

    await run('verify:verify', options);
  });
