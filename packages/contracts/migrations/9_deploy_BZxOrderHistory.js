var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxOrderHistory = artifacts.require("BZxOrderHistory");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(BZxOrderHistory);

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxOrderHistory.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxOrderHistory deploy: #done`);
  });
};
