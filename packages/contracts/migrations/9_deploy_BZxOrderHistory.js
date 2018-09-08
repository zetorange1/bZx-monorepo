var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxOrderHistory = artifacts.require("BZxOrderHistory");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxOrderHistory).then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxOrderHistory.address);
  });
};
