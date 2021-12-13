const {ethers} = require("hardhat");
const fs = require("fs");
const dotenv = require('dotenv');
const {getDeployedAddresses, writeDeployedAddresses} = require("./helpers");

deployContracts()
    .then(() => {
        console.log("DONE");
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });

function loadEnv() {
    dotenv.config();
    const {CHAIN_NAME, RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY} = process.env;
    if (!(CHAIN_NAME && RPC_ENDPOINT && DEPLOYER_PRIVATE_KEY)) {
        throw new Error("Must populate all values in .env - see .env.example for full list");
    }
    return {CHAIN_NAME, RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY};
}

function getDeployer(RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY) {
    const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
    const deployer = new ethers.Wallet(`0x${DEPLOYER_PRIVATE_KEY}`, provider);
    return deployer;
}

async function deployContracts() {
    // load .env
    const {CHAIN_NAME, RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY} = loadEnv();

    // load config.json
    const config = JSON.parse(fs.readFileSync(`./deploy/configs/${CHAIN_NAME}.json`));
    const {oldPartyToken, exchangeRate, partyDAOMultisig} = config;
    if (!(oldPartyToken && exchangeRate && partyDAOMultisig)) {
        throw new Error("Must populate config with oldPartyToken, exchangeRate and partyDAOMultisig");
    }

    // setup deployer wallet
    const deployer = getDeployer(RPC_ENDPOINT, DEPLOYER_PRIVATE_KEY);

    // deploy deprecation contract
    console.log(`Deploy DeprecationContract to ${CHAIN_NAME}`);
    const deprecationContract = await deploy(deployer,'DeprecateERC20', [oldPartyToken, exchangeRate]);
    console.log(`Deployed DeprecationContract to ${CHAIN_NAME}: `, deprecationContract.address);

    // deploy new Party token
    console.log(`Deploy Party token to ${CHAIN_NAME}`);
    const newToken = await deploy(deployer,'PartyToken', [partyDAOMultisig, deprecationContract.address]);
    console.log(`Deployed Party token to ${CHAIN_NAME}: `, newToken.address);

    // initialize deprecation contract with newToken address
    await deprecationContract.initialize(newToken.address);

    // get the existing deployed addresses
    let {directory, filename, contractAddresses} = getDeployedAddresses(CHAIN_NAME);

    // update the deployed address
    contractAddresses["deprecationContract"] = deprecationContract.address;
    contractAddresses["partyToken"] = newToken.address;

    // write the updated object
    writeDeployedAddresses(directory, filename, contractAddresses);

    console.log(`EmptyContract written to ${filename}`);
}

async function deploy(wallet, name, args = []) {
    const Implementation = await ethers.getContractFactory(name, wallet);
    const contract = await Implementation.deploy(...args);
    return contract.deployed();
}