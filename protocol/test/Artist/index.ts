import '@nomiclabs/hardhat-ethers';

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
} from './others';
import { setEndTimeTests, setStartTimeTests } from './timing';
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

  describe('setStartTime', () => {
    setStartTimeTests();
  });

  describe('setEndTime', () => {
    setEndTimeTests();
  });

  describe('setSignerAddress', () => {
    setSignerAddressTests();
  });

  describe('setPermissionedQuantity', () => {
    setPermissionedQuantityTests();
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

  describe('end-to-end tests', () => {
    endToEndTests();
  });
});
