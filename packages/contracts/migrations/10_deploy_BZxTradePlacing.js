var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxTradePlacing = artifacts.require("BZxTradePlacing");
var BZxTradePlacing0xV2 = artifacts.require("BZxTradePlacing0xV2");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxTradePlacing).then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxTradePlacing.address);

    await deployer.deploy(BZxTradePlacing0xV2);
    await bZxProxy.replaceContract(BZxTradePlacing0xV2.address);
  });
};
