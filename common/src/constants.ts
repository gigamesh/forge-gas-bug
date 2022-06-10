export const NETWORK_MAP = {
  1: 'mainnet',
  4: 'rinkeby',
  1337: 'hardhat',
  31337: 'hardhat',
};

export const baseURIs: { [key: string]: string } = {
  hardhat: 'http://localhost:8396/v1/',
  rinkeby: 'https://staging.metadata.sound.xyz/v1/',
  mainnet: 'https://metadata.sound.xyz/v1/',
};

export const SOUND_ADMIN_PUBLIC_ADDRESS = '0xed0faf139565bae4d856eeaffad7c81515457246';
