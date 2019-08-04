var TokenRegistry = artifacts.require("TokenRegistry");
var TestNetFaucet = artifacts.require("TestNetFaucet");
var TestNetOracle = artifacts.require("TestNetOracle");

const path = require("path");
const config = require("../protocol-config.js");

module.exports = (deployer, network, accounts) => {
  //if (true) return;
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage")
    network = "development";
  else {
    // comment out if we need to deploy to other networks
    return;
  }

  if (network != "mainnet" && network != "ropsten") {
    let tokens = [];
    deployer.then(async () => {

      var oracle = await TestNetOracle.deployed();
      for(let i=0; i <= 9; i++) {
        let t = await artifacts.require("TestToken"+i);
        await deployer.deploy(t);
        await tokens.push(t);

        if (i == 9) {
          await oracle.setRates(
            t.address,
            config["addresses"][network]["ZeroEx"]["WETH9"],
            web3.utils.toWei("1", "ether")
          );
        } else {
          await oracle.setRates(
            t.address,
            config["addresses"][network]["ZeroEx"]["WETH9"],
            web3.utils.toWei(((Math.floor(Math.random() * 100) + 2)/1000).toString(), "ether")
          );
        }
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
