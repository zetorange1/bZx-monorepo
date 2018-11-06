var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxLoanMaintenance = artifacts.require("BZxLoanMaintenance");
var BZxLoanMaintenance2 = artifacts.require("BZxLoanMaintenance2");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(BZxLoanMaintenance);
    await bZxProxy.replaceContract(BZxLoanMaintenance.address);

    await deployer.deploy(BZxLoanMaintenance2);
    await bZxProxy.replaceContract(BZxLoanMaintenance2.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanMaintenance deploy: #done`);
  });
};
