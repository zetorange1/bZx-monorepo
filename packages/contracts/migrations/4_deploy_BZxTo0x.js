var BZxTo0x = artifacts.require("BZxTo0x");
var BZxTo0xV2 = artifacts.require("BZxTo0xV2");
var ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

var config = require("../protocol-config.js");

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");
  if (network == "develop" || network == "testnet" || network == "coverage")
    network = "development";

  deployer
    .deploy(
      BZxTo0x,
      config["addresses"][network]["ZeroEx"]["ExchangeV1"],
      config["addresses"][network]["ZeroEx"]["ZRXToken"],
      config["addresses"][network]["ZeroEx"]["TokenTransferProxy"]
    )
    .then(async function(bZxTo0x) {
      /*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
			await bZxTo0x.setDebugMode(true);
		}*/

      // TokenTransferProxy needs to have unlimited transfer approval for ZRX from BZxTo0x
      await bZxTo0x.approveFor(
        config["addresses"][network]["ZeroEx"]["ZRXToken"],
        config["addresses"][network]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT
      );

      var bZxTo0xV2 = await deployer.deploy(
        BZxTo0xV2,
        config["addresses"][network]["ZeroEx"]["ExchangeV2"],
        config["addresses"][network]["ZeroEx"]["ZRXToken"],
        config["addresses"][network]["ZeroEx"]["ERC20Proxy"]
      );

      // ERC20Proxy needs to have unlimited transfer approval for ZRX from BZxTo0xV2
      await bZxTo0xV2.approveFor(
        config["addresses"][network]["ZeroEx"]["ZRXToken"],
        config["addresses"][network]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT
      );

      if (network == "development") {
        await deployer.deploy(
          ZeroExV2Helper,
          config["addresses"][network]["ZeroEx"]["ExchangeV2"]
        );
      }
    });
};
