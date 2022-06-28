import '@nomiclabs/hardhat-ethers';

import { adminTests } from './admin';
import { buyEditionTests } from './buyEdition';
import { createEditionTests } from './createEdition';
import { deploymentTests } from './deployment';
import { endToEndTests } from './endToEnd';
import {
  checkTicketNumbersTests,
  contractURITests,
  editionCountTests,
  getApprovedTests,
  ownersOfTokenIdsTests,
  royaltyInfoTests,
  setPermissionedQuantityTests,
  setSignerAddressTests,
  totalSupplyTests,
  transferFromTests,
  setOwnerOverrideTests,
  setBaseURITests,
} from './others';
import { withdrawFundsTests } from './withdrawFunds';

describe('Artist proxy', () => {
  describe('deployment', () => {
    deploymentTests();
  });

  describe('createEdition', () => {
    createEditionTests();
  });

  describe('buyEdition', () => {
    buyEditionTests();
  });

  describe('withdrawFunds', () => {
    withdrawFundsTests();
  });

  describe('setSignerAddress', () => {
    setSignerAddressTests();
  });

  describe('setPermissionedQuantity', () => {
    setPermissionedQuantityTests();
  });

  describe('setBaseURI', () => {
    setBaseURITests();
  });

  describe('getApproved', () => {
    getApprovedTests();
  });

  describe('transferFrom', () => {
    transferFromTests();
  });

  describe('totalSupply', () => {
    totalSupplyTests();
  });

  describe('contractURI', () => {
    contractURITests();
  });

  describe('royaltyInfo', () => {
    royaltyInfoTests();
  });

  describe('editionCount', () => {
    editionCountTests();
  });

  describe('ownersOfTokenIds', () => {
    ownersOfTokenIdsTests();
  });

  describe('checkTicketNumbers', () => {
    checkTicketNumbersTests();
  });

  describe('setOwnerOverride', () => {
    setOwnerOverrideTests();
  });

  describe('admin functionality', () => {
    adminTests();
  });

  describe('end-to-end tests', () => {
    endToEndTests();
  });
});
