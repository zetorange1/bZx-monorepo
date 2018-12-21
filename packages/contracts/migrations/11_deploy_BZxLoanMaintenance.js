var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var LoanMaintenance_MiscFunctions = artifacts.require("LoanMaintenance_MiscFunctions");
var LoanMaintenance_MiscFunctions2 = artifacts.require("LoanMaintenance_MiscFunctions2");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(LoanMaintenance_MiscFunctions);
    await bZxProxy.replaceContract(LoanMaintenance_MiscFunctions.address);

    await deployer.deploy(LoanMaintenance_MiscFunctions2);
    await bZxProxy.replaceContract(LoanMaintenance_MiscFunctions2.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanMaintenance deploy: #done`);
  });
};
