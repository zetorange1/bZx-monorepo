var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxOrderTaking = artifacts.require("BZxOrderTaking");
var BZxOrderTakingOnChain = artifacts.require("BZxOrderTakingOnChain");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxOrderTaking).then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxOrderTaking.address);

    await deployer.deploy(BZxOrderTakingOnChain);
    await bZxProxy.replaceContract(BZxOrderTakingOnChain.address);
  });
};
