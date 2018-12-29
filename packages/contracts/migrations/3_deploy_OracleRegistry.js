var OracleRegistry = artifacts.require("OracleRegistry");
const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    await deployer.deploy(OracleRegistry);

    console.log(`   > [${parseInt(path.basename(__filename))}] OracleRegistry deploy: #done`);
  });
};
