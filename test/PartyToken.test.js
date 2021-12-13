// SPDX-License-Identifier: MIT
// ============ External Imports ============
const { waffle } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
// ============ Internal Imports ============
const { deployTestContractSetup } = require('./helpers/deploy');
const { eth, encodeData } = require('./helpers/utils');

describe('PartyToken', async () => {
    // setup test variables
    let oldToken, newToken, deprecationContract;
    const signers = provider.getWallets();
    const user = signers[1];

    before(async () => {
        // DEPLOY TEST CONTRACT SETUP
        const contracts = await deployTestContractSetup(signers[0]);

        oldToken = contracts.oldToken;
        newToken = contracts.newToken;
        deprecationContract = contracts.deprecationContract;

        // transfer 1k old tokens to user's address
        await oldToken.transfer(user.address, eth(1000));
    });

    it('Can deprecate during lockup', async () => {
        // approve deprecation contract to spend tokens
        const data = encodeData(oldToken, 'approve', [deprecationContract.address, eth(1000)]);
        await user.sendTransaction({
            to: oldToken.address,
            data,
        });
        await expect(deprecationContract.migrate(user.address)).to.emit(deprecationContract,"Migrated", [user.address, eth(1000)]);
    });

    it('Cannot transfer during lockup', async () => {
        const data = encodeData(newToken, 'transfer', [signers[0].address, eth(20)]);
        await expect(user.sendTransaction({
            to: newToken.address,
            data,
        })).to.be.revertedWith("in lockup");
    });

    it('Cannot transferFrom during lockup', async () => {
        const data = encodeData(newToken, 'approve', [signers[0].address, eth(100)]);
        await user.sendTransaction({
            to: newToken.address,
            data,
        });
        await expect(newToken.transferFrom(user.address, signers[0].address, eth(20))).to.be.revertedWith("in lockup");
    });

    it('CAN transfer from PartyDAO multisig during lockup', async () => {
        await expect(newToken.transfer(signers[2].address, eth(20))).to.emit(newToken, "Transfer");
    });

    it('Can end lockup', async () => {
        await expect(newToken.unlock()).to.emit(newToken, "Unlocked");
    });

    it('Cannot call end lockup twice', async () => {
        await expect(newToken.unlock()).to.be.revertedWith("already unlocked");
    });

    it('CAN transfer after lockup', async () => {
        await expect(newToken.transfer(user.address, eth(20))).to.emit(newToken, "Transfer");

        const data = encodeData(newToken, 'transfer', [signers[0].address, eth(20)]);
        await expect(user.sendTransaction({
            to: newToken.address,
            data,
        })).to.emit(newToken, "Transfer");

    });

    it('CAN transferFrom after lockup', async () => {
        await expect(newToken.transferFrom(user.address, signers[0].address, eth(20))).to.emit(newToken, "Transfer");
    });

    it('CAN deprecate after lockup', async () => {
        // transfer 1k old tokens to user's address
        await oldToken.transfer(user.address, eth(1000));

        // approve deprecation contract to spend tokens
        const data = encodeData(oldToken, 'approve', [deprecationContract.address, eth(1000)]);
        await user.sendTransaction({
            to: oldToken.address,
            data,
        });
        await expect(deprecationContract.migrate(user.address)).to.emit(deprecationContract,"Migrated", [user.address, eth(1000)]);
    });
});
