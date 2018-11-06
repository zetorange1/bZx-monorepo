var BZxVault = artifacts.require("BZxVault");
const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
		await deployer.deploy(BZxVault);
		
    console.log(`   > [${parseInt(path.basename(__filename))}] BZxVault deploy: #done`);
  });
};
