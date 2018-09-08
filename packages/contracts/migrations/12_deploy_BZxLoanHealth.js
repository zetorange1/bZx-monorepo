var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxLoanHealth = artifacts.require("BZxLoanHealth");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxLoanHealth).then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxLoanHealth.address);
  });
};
