const {eth} = require("./utils");

async function deploy(name, args = []) {
  const Implementation = await ethers.getContractFactory(name);
  const contract = await Implementation.deploy(...args);
  return contract.deployed();
}

async function deployTestContractSetup(signer) {
  // deploy test old token
  const oldToken = await deploy("TestCrowdfundERC20")

  // deploy deprecation contract
  const deprecationContract = await deploy("DeprecateERC20", [oldToken.address, 280])

  // deploy new Party token
  const newToken = await deploy("PartyToken", [signer.address, deprecationContract.address]);

  // initialize deprecation contract with newToken address
  await deprecationContract.initialize(newToken.address);

  // MULTISIG TRANSACTIONS
  // transfer 7M new token to deprecation contract
  await newToken.transfer(deprecationContract.address, eth(7000000));

  // transfer 25k old token to burn address
  await oldToken.transfer(ethers.constants.AddressZero, eth(25000));

  return {
    oldToken,
    newToken,
    deprecationContract
  };
}

module.exports = {
  deployTestContractSetup,
  deploy,
};
