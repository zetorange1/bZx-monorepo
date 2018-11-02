var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxLoanHealth = artifacts.require("BZxLoanHealth");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(BZxLoanHealth);

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.replaceContract(BZxLoanHealth.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanHealth deploy: #done`);
  });
};
