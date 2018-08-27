var BZxProxy = artifacts.require("BZxProxy");
var BZxOrderHistory = artifacts.require("BZxOrderHistory");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BZxOrderHistory).then(async function() {
    var bZxProxy = await BZxProxy.deployed();
    await bZxProxy.replaceContract(BZxOrderHistory.address);
  });
};
