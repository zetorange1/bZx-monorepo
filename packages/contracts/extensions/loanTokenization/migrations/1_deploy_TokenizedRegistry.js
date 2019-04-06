
const path = require("path");
let TokenizedRegistry = artifacts.require("TokenizedRegistry");

module.exports = function(deployer, network, accounts) {

  deployer.then(async function() {

    // Deploy TokenizedRegistry
    await deployer.deploy(
      TokenizedRegistry
    );

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedRegistry deploy: #done`);
  });
};
