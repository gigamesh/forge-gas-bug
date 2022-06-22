import { expect } from 'chai';
import { setUpContract, EDITION_ID } from '../testHelpers';
import { ethers } from 'hardhat';

const adminRole = ethers.utils.id('ADMIN');

export function adminTests() {
  it('enables owner to add admins', async () => {
    const { artistContract, artistAccount } = await setUpContract();

    for (let i = 0; i < 30; i++) {
      const newAdmin = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
      await artistContract.connect(artistAccount).grantRole(adminRole, newAdmin.address);

      const hasRole = await artistContract.hasRole(adminRole, newAdmin.address);

      await expect(hasRole).to.be.true;
    }
  });

  it('enables owner to revoke admins', async () => {
    const { artistContract, artistAccount } = await setUpContract();

    for (let i = 0; i < 10; i++) {
      const newAdmin = ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
      await artistContract.connect(artistAccount).grantRole(adminRole, newAdmin.address);

      const hasRole = await artistContract.hasRole(adminRole, newAdmin.address);

      await expect(hasRole).to.be.true;

      await artistContract.connect(artistAccount).revokeRole(adminRole, newAdmin.address);

      const stillHasRole = await artistContract.hasRole(adminRole, newAdmin.address);

      await expect(stillHasRole).to.be.false;
    }
  });

  it('prevents non-owner from adding an admin', async () => {
    const { artistContract, miscAccounts } = await setUpContract();

    const notOwner = miscAccounts[0];

    const tx = artistContract.connect(notOwner).grantRole(adminRole, notOwner.address);

    await expect(tx).to.be.revertedWith(`Ownable: caller is not the owner`);
  });

  it('prevents non-owner from revoking an admin', async () => {
    const { artistContract, artistAccount, miscAccounts } = await setUpContract();

    const notOwner = miscAccounts[0];
    const roleRecipient = miscAccounts[1];

    await artistContract.connect(artistAccount).grantRole(adminRole, roleRecipient.address);

    const tx = artistContract.connect(notOwner).revokeRole(adminRole, roleRecipient.address);

    await expect(tx).to.be.revertedWith(`Ownable: caller is not the owner`);
  });

  it('admins can call protected functions', async () => {
    const { artistContract, miscAccounts, artistAccount } = await setUpContract();

    // add some admins
    for (let i = 0; i < 10; i++) {
      const admin = miscAccounts[i];
      await artistContract.connect(artistAccount).grantRole(adminRole, admin.address);

      const someTimeStamp = 8675309;
      const newPermissionedQuantity = 696969;
      await artistContract.connect(admin).setStartTime(EDITION_ID, someTimeStamp);
      await artistContract.connect(admin).setEndTime(EDITION_ID, someTimeStamp);
      await artistContract.connect(admin).setPermissionedQuantity(EDITION_ID, newPermissionedQuantity);

      const editionInfo = await artistContract.editions(EDITION_ID);

      await expect(editionInfo.startTime).to.equal(someTimeStamp);
      await expect(editionInfo.endTime).to.equal(someTimeStamp);
      await expect(editionInfo.permissionedQuantity).to.equal(newPermissionedQuantity);
    }
  });

  it(`AccessManager protects protected functions`, async () => {
    const { artistContract, miscAccounts } = await setUpContract();
    const tx1 = artistContract.connect(miscAccounts[0]).setStartTime(EDITION_ID, 0);
    const tx2 = artistContract.connect(miscAccounts[0]).setEndTime(EDITION_ID, 0);
    const tx3 = artistContract.connect(miscAccounts[0]).setPermissionedQuantity(EDITION_ID, 0);

    const revertMsg = 'unauthorized';

    await expect(tx1).to.be.revertedWith(revertMsg);
    await expect(tx2).to.be.revertedWith(revertMsg);
    await expect(tx3).to.be.revertedWith(revertMsg);
  });
}
