var BZxProxy = artifacts.require("BZxProxy");
var BZxLoanMaintenance = artifacts.require("BZxLoanMaintenance");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxLoanMaintenance).then(async function() {
    var bZxProxy = await BZxProxy.deployed();
    await bZxProxy.replaceContract(BZxLoanMaintenance.address);
  });
};
