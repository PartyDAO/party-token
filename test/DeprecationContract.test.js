// SPDX-License-Identifier: MIT
// ============ External Imports ============
const { waffle } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
// ============ Internal Imports ============
const { deployTestContractSetup } = require('./helpers/deploy');
const { eth, encodeData } = require('./helpers/utils');

describe('DeprecationContract', async () => {
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

  it('Can only initialize deprecation contract once', async () => {
    await expect(deprecationContract.initialize(user.address)).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it('Fails to deprecate before approval is sent', async () => {
    await expect(deprecationContract.migrate(user.address)).to.be.reverted;
  });

  it('Approves deprecation contract', async () => {
    // approve deprecation contract to spend tokens
    const data = encodeData(oldToken, 'approve', [deprecationContract.address, eth(1000)]);
    await user.sendTransaction({
      to: oldToken.address,
      data,
    });
  });

  it('Starts with 0 totalMigrated', async () => {
    const totalMigrated = await deprecationContract.totalMigrated();
    await expect(totalMigrated).to.equal(0);
  });

  it('Starts with expected token balances', async () => {
    let userBalanceOld = await oldToken.balanceOf(user.address);
    await expect(userBalanceOld).to.equal(eth(1000));

    // user has 0 new tokens
    let userBalanceNew = await newToken.balanceOf(user.address);
    await expect(userBalanceNew).to.equal(0);

    // burn address has 25k old tokens
    let burnBalanceOld = await oldToken.balanceOf(ethers.constants.AddressZero);
    await expect(burnBalanceOld).to.equal(eth(25000));

    // deprecation contract has 700k new tokens
    let deprecationBalanceNew = await newToken.balanceOf(deprecationContract.address);
    await expect(deprecationBalanceNew).to.equal(eth(700000));
  });

  it('Deprecates successfully', async () => {
    await expect(deprecationContract.migrate(user.address)).to.emit(deprecationContract,"Migrated", [user.address, eth(1000)]);
  });

  it('Updates totalMigrated', async () => {
    const totalMigrated = await deprecationContract.totalMigrated();
    await expect(totalMigrated).to.equal(eth(1000));
  });

  it('Has expected token balances after deprecation', async () => {
    // user has 0 old tokens
    let userBalanceOld = await oldToken.balanceOf(user.address);
    await expect(userBalanceOld).to.equal(0);

    // user has 28k new tokens
    let userBalanceNew = await newToken.balanceOf(user.address);
    await expect(userBalanceNew).to.equal(eth(28000));

    // burn address has 1k more old tokens
    let burnBalanceOld = await oldToken.balanceOf(ethers.constants.AddressZero);
    await expect(burnBalanceOld).to.equal(eth(26000));

    // deprecation contract has 28k less new tokens
    let deprecationBalanceNew = await newToken.balanceOf(deprecationContract.address);
    await expect(deprecationBalanceNew).to.equal(eth(672000));
  });
});