var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxOrderTaking = artifacts.require("BZxOrderTaking");
var BZxOrderTakingOnChain = artifacts.require("BZxOrderTakingOnChain");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(BZxOrderTaking);

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxOrderTaking.address);

    await deployer.deploy(BZxOrderTakingOnChain);

    await bZxProxy.replaceContract(BZxOrderTakingOnChain.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxOrderTakingOnChain deploy: #done`);
  });
};
