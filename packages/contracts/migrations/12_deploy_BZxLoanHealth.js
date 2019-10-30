var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var LoanHealth_MiscFunctions = artifacts.require("LoanHealth_MiscFunctions");
var LoanHealth_MiscFunctions2 = artifacts.require("LoanHealth_MiscFunctions2");
var LoanHealth_MiscFunctions3 = artifacts.require("LoanHealth_MiscFunctions3");
var LoanHealth_MiscFunctions4 = artifacts.require("LoanHealth_MiscFunctions4");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(LoanHealth_MiscFunctions);
    await bZxProxy.replaceContract(LoanHealth_MiscFunctions.address);

    await deployer.deploy(LoanHealth_MiscFunctions2);
    await bZxProxy.replaceContract(LoanHealth_MiscFunctions2.address);

    await deployer.deploy(LoanHealth_MiscFunctions3);
    await bZxProxy.replaceContract(LoanHealth_MiscFunctions3.address);

    await deployer.deploy(LoanHealth_MiscFunctions4);
    await bZxProxy.replaceContract(LoanHealth_MiscFunctions4.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanHealth deploy: #done`);
  });
};
