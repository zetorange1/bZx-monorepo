var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var iTokens_loanOpeningFunctions = artifacts.require("iTokens_loanOpeningFunctions");
var iTokens_loanManagementFunctions = artifacts.require("iTokens_loanManagementFunctions");
var iTokens_loanManagementFunctions2 = artifacts.require("iTokens_loanManagementFunctions2");
var iTokens_loanManagementFunctions3 = artifacts.require("iTokens_loanManagementFunctions3");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    
    await deployer.deploy(iTokens_loanOpeningFunctions);
    await bZxProxy.replaceContract(iTokens_loanOpeningFunctions.address);

    await deployer.deploy(iTokens_loanManagementFunctions);
    await bZxProxy.replaceContract(iTokens_loanManagementFunctions.address);

    await deployer.deploy(iTokens_loanManagementFunctions2);
    await bZxProxy.replaceContract(iTokens_loanManagementFunctions2.address);

    await deployer.deploy(iTokens_loanManagementFunctions3);
    await bZxProxy.replaceContract(iTokens_loanManagementFunctions3.address);

    /*
    Kovan:
    bZxProxy = await iTokens_loanManagementFunctions3.at(BZxProxy.address)
    await bZxProxy.setLenderIsiTokenBatch(
      [
        "0x54be07007c680ba087b3fcd8e675d1c929b6aaf5",
        "0xa1e58f3b1927743393b25f261471e1f2d3d9f0f6",
        "0x6c1e2b0f67e00c06c8e2be7dc681ab785163ff4d",
        "0x3e37E3f4C3b0B0b5944Cc1F366152Dea22EF63f9"
      ],
      [
        true,
        true,
        true,
        true
      ]
    );
    */

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxLoanHealth deploy: #done`);
  });
};
