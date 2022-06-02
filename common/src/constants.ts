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

export enum Genres {
  ALTERNATIVE_ROCK = 'Alternative Rock',
  AMBIENT = 'Ambient',
  CLASSICAL = 'Classical',
  COUNTRY = 'Country',
  DANCE_EDM = 'Dance & EDM',
  DANCEHALL = 'Dancehall',
  DEEP_HOUSE = 'Deep House',
  DISCO = 'Disco',
  DRUM_BASS = 'Drum & Bass',
  DUBSTEP = 'Dubstep',
  ELECTRONIC = 'Electronic',
  FOLK_SINGER_SONGWRITER = 'Folk & Singer-Songwriter',
  HIP_HOP_RAP = 'Hip-hop & Rap',
  HOUSE = 'House',
  INDIE = 'Indie',
  JAZZ_BLUES = 'Jazz & Blues',
  LATIN = 'Latin',
  METAL = 'Metal',
  PIANO = 'Piano',
  POP = 'Pop',
  R_B_Soul = 'R&B & Soul',
  Reggae = 'Reggae',
  Reggaeton = 'Reggaeton',
  ROCK = 'Rock',
  SOUNDTRACK = 'Soundtrack',
  TECHNO = 'Techno',
  TRANCE = 'Trance',
  TRAP = 'Trap',
  TRIPHOP = 'Triphop',
  WORLD = 'World',
}

export const SOUND_ADMIN_PUBLIC_ADDRESS = '0xed0faf139565bae4d856eeaffad7c81515457246';
