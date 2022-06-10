import { constants } from '@soundxyz/common';
import * as dotenv from 'dotenv';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getEtherscanLink } from '../helpers';

dotenv.config();

const { NETWORK_MAP } = constants;

const func: DeployFunction = async function ({ ethers, deployments, network }: HardhatRuntimeEnvironment) {
  const [deployer] = await ethers.getSigners();
  const chainId = parseInt(await network.provider.send('eth_chainId'));
  const networkName = NETWORK_MAP[chainId];

  if (chainId === 1) {
    console.log(`Only use this script for local & test network deployment.`);
    return;
  }

  console.log(`Starting deployment on ${networkName} (chainId ${chainId})`);

  // ============= Deployment ============= //

  const ArtistCreatorDeployment = await deployments.deploy('ArtistCreator', {
    from: deployer.address,
    log: true,
    proxy: {
      owner: deployer.address,
      proxyContract: 'ArtistCreatorProxy',
      execute: {
        methodName: 'initialize',
        args: [],
      },
    },
  });

  // Upgrade ArtistCreator
  if (Number(process.env.ARTIST_VERSION) >= 5) {
    console.log('Upgrading ArtistCreator...');
    const artistCreatorFactoryName = `ArtistCreatorV2`;
    const ArtistCreatorFactory = await ethers.getContractFactory(artistCreatorFactoryName);
    const newImplementation = await ArtistCreatorFactory.deploy();

    const artistCreator = await ethers.getContractAt('ArtistCreator', ArtistCreatorDeployment.address, deployer);
    const upgradeTx = await artistCreator.upgradeTo(newImplementation.address);

    console.log('Waiting for tx:', getEtherscanLink(network.name, upgradeTx.hash));

    const receipt = await upgradeTx.wait();

    if (receipt.status === 1) {
      console.log('ArtistCreator upgraded successfully');
    } else {
      console.error('ArtistCreator upgrade failed');
    }
  }
};

export default func;
