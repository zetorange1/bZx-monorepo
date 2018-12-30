var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var OrderHistory_MiscFunctions = artifacts.require("OrderHistory_MiscFunctions");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    await deployer.deploy(OrderHistory_MiscFunctions);
    await bZxProxy.replaceContract(OrderHistory_MiscFunctions.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxOrderHistory deploy: #done`);
  });
};
