var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxOrderTaking = artifacts.require("BZxOrderTaking");
var BZxOrderTaking2 = artifacts.require("BZxOrderTaking2");
var BZxOrderTakingOnChain = artifacts.require("BZxOrderTakingOnChain");
var BZxOrderTakingOnChain2 = artifacts.require("BZxOrderTakingOnChain2");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    await deployer.deploy(BZxOrderTaking);
    await bZxProxy.replaceContract(BZxOrderTaking.address);

    await deployer.deploy(BZxOrderTaking2);
    await bZxProxy.replaceContract(BZxOrderTaking2.address);

    await deployer.deploy(BZxOrderTakingOnChain);
    await bZxProxy.replaceContract(BZxOrderTakingOnChain.address);

    await deployer.deploy(BZxOrderTakingOnChain2);
    await bZxProxy.replaceContract(BZxOrderTakingOnChain2.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxOrderTakingOnChain deploy: #done`);
  });
};
