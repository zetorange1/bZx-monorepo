var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxLoanMaintenance = artifacts.require("BZxLoanMaintenance");
var BZxLoanMaintenance2 = artifacts.require("BZxLoanMaintenance2");

module.exports = function(deployer, network, accounts) {
  deployer.then(async function() {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(BZxLoanMaintenance);
    await bZxProxy.replaceContract(BZxLoanMaintenance.address);

    await deployer.deploy(BZxLoanMaintenance2);
    await bZxProxy.replaceContract(BZxLoanMaintenance2.address);
  });
};
