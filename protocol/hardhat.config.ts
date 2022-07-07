import './tasks/buyEdition';
import './tasks/createEdition';
import './tasks/deployEgg';
import './tasks/deployProxy';
import './tasks/deployArtist';
import './tasks/upgradeArtistCreator';
import './tasks/getBeacon';
import './tasks/nftTransfer';
import './tasks/prepSplit';
import './tasks/setAdmin';
import './tasks/transferOwnership';
import './tasks/upgradeArtist';
import './tasks/verifyContract';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-solhint';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

dotenv.config();

const compilerSettings = {
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        ...compilerSettings,
      },
      {
        version: '0.8.7',
        ...compilerSettings,
      },
      {
        version: '0.8.14',
        ...compilerSettings,
      },
    ],
    settings: {
      // todo: turn on optimizer only when deploying to testnet or prod
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: './typechain',
  },
  networks: {
    hardhat: {
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      chainId: 1337,
      saveDeployments: true,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      mining: {
        auto: true,
        interval: 5_000,
      },
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    // truffle dashboard
    truffle: {
      url: 'http://localhost:24012/rpc',
      timeout: 300_000,
    },
  },
  paths: {
    sources: 'contracts/',
    deployments: 'src/deployments',
    artifacts: 'src/artifacts',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    excludeContracts: [
      'Artist.sol',
      'ArtistV2.sol',
      'ArtistV3.sol',
      'ArtistV4.sol',
      'ArtistV6Test.sol',
      'ArtistCreator.sol',
    ],
  },
};

export default config;
