var BZRxToken = artifacts.require("BZRxToken");
const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    if (network != "mainnet") {
      await deployer.deploy(BZRxToken);
      console.log(`   > [${parseInt(path.basename(__filename))}] OracleRegistry deploy: #done`);
    } else {
      console.log(`   > [${parseInt(path.basename(__filename))}] OracleRegistry deploy: #skiped`);
    }
  });
};
