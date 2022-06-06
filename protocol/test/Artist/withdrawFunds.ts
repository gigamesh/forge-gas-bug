import { expect } from 'chai';
import { BigNumber } from 'ethers';

import { EDITION_ID, EMPTY_SIGNATURE, NULL_TICKET_NUM, provider, setUpContract } from '../helpers';

export async function withdrawFundsTests() {
  it('transfers edition funds to the fundingRecipient', async () => {
    const quantity = 10;
    const { fundingRecipient, artistContract, price, miscAccounts, soundOwner } = await setUpContract({
      quantity: BigNumber.from(quantity),
    });

    const originalRecipientBalance = await provider.getBalance(fundingRecipient);

    for (let count = 1; count <= quantity; count++) {
      const currentBuyer = miscAccounts[count];
      await artistContract.connect(currentBuyer).buyEdition(EDITION_ID, EMPTY_SIGNATURE, NULL_TICKET_NUM, {
        value: price,
      });
    }

    // any address can call withdrawFunds
    await artistContract.connect(soundOwner).withdrawFunds(EDITION_ID);
    const contractBalance = await provider.getBalance(artistContract.address);
    // All the funds are extracted.
    await expect(contractBalance.toString()).to.eq('0');

    const recipientBalance = await provider.getBalance(fundingRecipient);
    const revenue = price.mul(quantity);

    await expect(recipientBalance.toString()).to.eq(originalRecipientBalance.add(revenue));
  });
}
