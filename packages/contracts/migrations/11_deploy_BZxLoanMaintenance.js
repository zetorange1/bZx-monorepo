var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxLoanMaintenance = artifacts.require("BZxLoanMaintenance");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxLoanMaintenance).then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxLoanMaintenance.address);
  });
};
