import '@nomiclabs/hardhat-ethers';

import { createEditionTests } from './createEdition';
import { endToEndTests } from './endToEnd';
import {
  checkTicketNumbersTests,
  editionCountTests,
  ownersOfTokenIdsTests,
  setPermissionedQuantityTests,
  setSignerAddressTests,
  setOwnerOverrideTests,
  setBaseURITests,
} from './others';

describe('Artist proxy', () => {
  describe('createEdition', () => {
    createEditionTests();
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

  describe('end-to-end tests', () => {
    endToEndTests();
  });
});
