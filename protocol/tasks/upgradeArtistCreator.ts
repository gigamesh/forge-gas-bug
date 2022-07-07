import { task } from 'hardhat/config';
import { getEtherscanLink } from '../helpers';

const MAX_GAS_PRICE = 150_000_000_000; // wei

task('upgradeArtistCreator', 'Deploys a new ArtistCreator implementation & points proxy to it via upgradeTo')
  .addParam('newVersion', 'The version number of the new ArtistCreator implementation')
  .setAction(async (args, hardhat) => {
    const { ethers, run, network, deployments } = hardhat;
    const ArtistCreatorFactory = await ethers.getContractFactory(`ArtistCreatorV${args.newVersion}`);
    const newArtistCreator = await ArtistCreatorFactory.deploy();

    const currentGasPrice = await ethers.provider.getGasPrice();
    const gasPriceInGwei = ethers.utils.formatUnits(currentGasPrice, 'gwei');

    // Bail out if we're deploying to mainnet and gas price is too high
    if (network.name === 'mainnet' && currentGasPrice.gt(MAX_GAS_PRICE)) {
      console.log(`Gas price is too high!: ${gasPriceInGwei} gwei`);
      return;
    }

    console.log(
      `Deploying ArtistCreatorV${args.newVersion}.sol on ${network.name}:`,
      getEtherscanLink(network.name, newArtistCreator.deployTransaction.hash)
    );

    const deployReceipt = await newArtistCreator.deployTransaction.wait();

    if (deployReceipt.status !== 1) {
      console.error('Deployment failed');
      return;
    }

    if (network.name === 'mainnet') {
      console.log(
        `Deployment successful! You can now use the gnosis safe to upgrade to the new logic contract:`,
        newArtistCreator.address
      );
    } else {
      console.log(`ArtistCreatorV${args.newVersion} deployed successfully! Upgrading proxy...`);

      // Upgrade proxy to new implementation
      const proxyDeployment = await deployments.get('ArtistCreator');
      const artistCreatorProxy = await ethers.getContractAt('ArtistCreator', proxyDeployment.address);

      const upgradeTx = await artistCreatorProxy.upgradeTo(newArtistCreator.address);

      console.log(`Tx submitted: ${getEtherscanLink(network.name, upgradeTx.hash)}`);

      const receipt = await upgradeTx.wait();

      if (receipt.status !== 1) {
        console.error('ArtistCreator.upgradeTo transaction failed');
      }

      console.log('Waiting for etherscan to index the bytecode...');

      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }

    console.log('Verifying on etherscan...');

    const options: any = {
      address: newArtistCreator.address,
      constructorArguments: [],
    };

    await run('verify:verify', options);
  });
