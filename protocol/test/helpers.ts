import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { helpers } from '@soundxyz/common';
import { BigNumber, Contract } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { ethers, waffle } from 'hardhat';

import { SplitMain__factory } from '../typechain';

export type DeployArtistFn = typeof deployArtistProxy;

const { getAuthSignature } = helpers;
export const { provider } = waffle;

//========== Constants =========//

export const MAX_UINT32 = 4294967295;
export const EXAMPLE_ARTIST_NAME = 'Alpha & Omega';
export const EXAMPLE_ARTIST_ID = 1;
export const EXAMPLE_ARTIST_SYMBOL = 'AOMEGA';
export const BASE_URI = `https://sound-staging.vercel.app/api/metadata/`;
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const EMPTY_SIGNATURE =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
export const INVALID_PRIVATE_KEY = '0xb73249a6bf495f81385ce91b84cc2eff129011fea429ba7f1827d73b06390208';
export const NULL_TICKET_NUM = '0x0';
export const CHAIN_ID = 1337;
export const EDITION_ID = '1';

//========= Types ==========//

type SplitInfo = {
  accounts: string[];
  percentAllocations: number[];
  distributorFee: number;
  controller: string;
};

type CustomMintArgs = {
  quantity?: BigNumber;
  price?: BigNumber;
  startTime?: BigNumber;
  endTime?: BigNumber;
  editionCount?: number;
  royaltyBPS?: BigNumber;
  fundingRecipient?: SignerWithAddress;
  permissionedQuantity?: BigNumber;
  skipCreateEditions?: boolean;
  signer?: SignerWithAddress;
  artistContractType?: 'IMPLEMENTATION' | 'PROXY';
};

//========= Helpers ==========//

export async function createArtist(
  artistCreator: Contract,
  signer: SignerWithAddress,
  artistName: string,
  symbol: string,
  baseURI: string
) {
  const chainId = (await provider.getNetwork()).chainId;

  // Get sound.xyz signature to approve artist creation
  const signature = await getAuthSignature({
    artistWalletAddr: signer.address,
    privateKey: process.env.ADMIN_PRIVATE_KEY,
    chainId,
    provider,
  });

  return artistCreator.connect(signer).createArtist(signature, artistName, symbol, baseURI);
}

export type EditionArgs = [
  string, // fundingRecipient
  number | BigNumber, // price
  number | BigNumber, // quantity
  number | BigNumber, // royaltyBPS
  number | BigNumber, // startTime
  number | BigNumber, // endTime
  (number | BigNumber)?, // permissionQuantity
  (string | undefined)? // signerAddress
];

export async function createEdition({
  artistContract,
  artistAccount,
  editionArgs,
}: {
  artistContract: Contract;
  artistAccount: SignerWithAddress;
  editionArgs: EditionArgs;
}) {
  return await artistContract.connect(artistAccount).createEdition(...editionArgs);
}

export function currentSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function getRandomInt(min = 0, max = MAX_UINT32) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomBN(max?: number) {
  const rando = BigNumber.from(ethers.utils.randomBytes(4));
  if (max) {
    return rando.mod(max.toString());
  }
  return rando;
}

export function getRandomAddress() {
  return ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${getRandomInt(0, 10000)}`).address;
}

export async function deployArtistImplementation({ artistAccount }: { artistAccount: SignerWithAddress }) {
  const Artist = await ethers.getContractFactory('ArtistV4');

  const protoArtist = await Artist.connect(artistAccount).deploy();
  await protoArtist.deployed();

  await protoArtist.initialize(
    artistAccount.address,
    EXAMPLE_ARTIST_ID,
    EXAMPLE_ARTIST_NAME,
    EXAMPLE_ARTIST_SYMBOL,
    BASE_URI
  );

  return protoArtist;
}

export async function deployArtistProxy({
  artistAccount,
  soundOwner,
  artistCreatorVersion,
}: {
  artistAccount: SignerWithAddress;
  soundOwner: SignerWithAddress;
  artistCreatorVersion?: number;
}) {
  // Deploy & initialize ArtistCreator
  const artistCreatorName = `ArtistCreator${artistCreatorVersion ? 'V' + artistCreatorVersion : ''}`;
  const ArtistCreator = await ethers.getContractFactory(artistCreatorName);
  const artistCreator = await ArtistCreator.connect(soundOwner).deploy();
  await artistCreator.initialize();
  await artistCreator.deployed();

  // Deploy ArtistV4 implementation
  const ArtistV4 = await ethers.getContractFactory('ArtistV4');
  const chainId = (await provider.getNetwork()).chainId;
  const artistV4Impl = await ArtistV4.deploy();
  await artistV4Impl.deployed();

  // Upgrade beacon to point to ArtistV4 implementation
  const beaconAddress = await artistCreator.beaconAddress();
  const beaconContract = await ethers.getContractAt('UpgradeableBeacon', beaconAddress, soundOwner);
  const beaconTx = await beaconContract.upgradeTo(artistV4Impl.address);
  await beaconTx.wait();

  // Get sound.xyz signature to approve artist creation
  const signature = await getAuthSignature({
    artistWalletAddr: artistAccount.address,
    privateKey: process.env.ADMIN_PRIVATE_KEY,
    chainId,
    provider,
  });

  const tx = await artistCreator
    .connect(artistAccount)
    .createArtist(signature, EXAMPLE_ARTIST_NAME, EXAMPLE_ARTIST_SYMBOL, BASE_URI);
  const receipt = await tx.wait();
  const contractAddress = receipt.events[3].args.artistAddress;

  return ethers.getContractAt('ArtistV4', contractAddress);
}

// shifts edition id to the left by 128 bits and adds the token id in the bottom bits
export function getTokenId(editionId: number | string, numSold: number | string) {
  const shiftFactor = BigNumber.from(1).mul(2).pow(128);
  return BigNumber.from(editionId).mul(shiftFactor).add(numSold);
}

export async function createSplit({ splitMainAddress, splitInfo }: { splitMainAddress; splitInfo: SplitInfo }) {
  const { accounts, percentAllocations, distributorFee, controller } = splitInfo;

  const splitMain = await SplitMain__factory.connect(splitMainAddress, provider);
  const tx = await splitMain.createSplit(accounts, percentAllocations, distributorFee, controller);

  const receipt = await tx.wait();
  const splitAddress = receipt.events.find((e) => e.event === 'CreateSplit').args.split;

  if (!splitAddress) {
    throw new Error('Split address not found in event logs');
  }

  return splitAddress;
}

export async function setUpContract(customConfig: CustomMintArgs = {}) {
  const editionCount = customConfig.editionCount || 1;

  const signers = await ethers.getSigners();
  const [soundOwner, artistAccount, ...miscAccounts] = signers;

  const artistContract = await (customConfig.artistContractType === 'IMPLEMENTATION'
    ? deployArtistImplementation({ artistAccount })
    : deployArtistProxy({ artistAccount, soundOwner }));

  const price = customConfig.price || parseEther('0.1');
  const quantity = customConfig.quantity || getRandomBN();
  const royaltyBPS = customConfig.royaltyBPS || BigNumber.from(0);
  const startTime = customConfig.startTime || BigNumber.from(0x0); // default to start of unix epoch
  const endTime = customConfig.endTime || BigNumber.from(MAX_UINT32);
  const fundingRecipient = customConfig.fundingRecipient || artistAccount;
  const permissionedQuantity = customConfig.permissionedQuantity || BigNumber.from(0);
  const signerAddress = customConfig.signer === null ? NULL_ADDRESS : soundOwner.address;

  let eventData;

  if (!customConfig.skipCreateEditions) {
    for (let i = 0; i < editionCount; i++) {
      const createEditionTx = await createEdition({
        artistContract,
        artistAccount,
        editionArgs: [
          fundingRecipient.address,
          price,
          quantity,
          royaltyBPS,
          startTime,
          endTime,
          permissionedQuantity,
          signerAddress,
        ],
      });

      const editionReceipt = await createEditionTx.wait();
      const contractEvent = artistContract.interface.parseLog(editionReceipt.events[0]);

      // note: if editionCount > 1, this will be the last event emitted
      eventData = contractEvent.args;
    }
  }

  return {
    artistContract,
    fundingRecipient,
    price,
    quantity,
    royaltyBPS,
    startTime,
    endTime,
    permissionedQuantity,
    signerAddress,
    soundOwner,
    artistAccount,
    miscAccounts,
    eventData,
  };
}
