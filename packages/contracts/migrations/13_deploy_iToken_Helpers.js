var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var iTokens_loanOpeningFunctions = artifacts.require("iTokens_loanOpeningFunctions");
//var iTokens_loanManagementFunctions = artifacts.require("iTokens_loanManagementFunctions");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(iTokens_loanOpeningFunctions);
    await bZxProxy.replaceContract(iTokens_loanOpeningFunctions.address);

    //await deployer.deploy(iTokens_loanManagementFunctions);
    //await bZxProxy.replaceContract(iTokens_loanManagementFunctions.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanHealth deploy: #done`);
  });
};
