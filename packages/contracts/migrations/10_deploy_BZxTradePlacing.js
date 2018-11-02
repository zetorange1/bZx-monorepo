var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxTradePlacing = artifacts.require("BZxTradePlacing");
var BZxTradePlacing0xV2 = artifacts.require("BZxTradePlacing0xV2");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    await deployer.deploy(BZxTradePlacing);
    await bZxProxy.replaceContract(BZxTradePlacing.address);

    await deployer.deploy(BZxTradePlacing0xV2);
    await bZxProxy.replaceContract(BZxTradePlacing0xV2.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxTradePlacing0xV2 deploy: #done`);
  });
};
