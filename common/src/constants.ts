export const NETWORK_MAP = {
  1: 'mainnet',
  4: 'rinkeby',
  1337: 'hardhat',
  31337: 'hardhat',
};

export const baseURIs: { [key: string]: string } = {
  hardhat: 'http://localhost:3000/api/metadata/',
  rinkeby: 'https://sound-staging.vercel.app/api/metadata/',
  mainnet: 'https://sound.xyz/api/metadata/',
};

export const SOUND_ADMIN_PUBLIC_ADDRESS = '0xed0faf139565bae4d856eeaffad7c81515457246';
