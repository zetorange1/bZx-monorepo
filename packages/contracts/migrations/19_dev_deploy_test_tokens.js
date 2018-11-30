var TokenRegistry = artifacts.require("TokenRegistry");
var TestNetFaucet = artifacts.require("TestNetFaucet");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  //if (true) return;
  if (network == "develop" || network == "development" || network == "testnet" || network == "coverage")
    network = "development";
  else {
    // comment out if we need to deploy to other networks
    return;
  }

  if (network != "mainnet" && network != "ropsten") {
    let tokens = [];
    deployer.then(async () => {
      for(let i=0; i <= 9; i++) {
        let t = await artifacts.require("TestToken"+i);
        await deployer.deploy(t);
        await tokens.push(t);
      }

      var registry = await TokenRegistry.deployed();

      var faucet = await TestNetFaucet.deployed();

      var token, name, symbol;
      for (var i = 0; i <= 9; ++i) {
        token = await tokens[i].deployed();
        name = await token.name.call();
        symbol = await token.symbol.call();

        await registry.addToken(token.address, name, symbol, 18, "");

        // transfer a large amount to faucet
        await token.transfer(faucet.address, web3.utils.toWei("100000000000000000", "ether"));
      }

      console.log(`   > [${parseInt(path.basename(__filename))}] Test Tokens deploy: #done`);
    });
  }
};
