var BZxTo0x = artifacts.require("BZxTo0x");
var BZxTo0xV2 = artifacts.require("BZxTo0xV2");
var ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

const path = require("path");
const config = require("../protocol-config.js");

const BN = require("bn.js");
const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

module.exports = (deployer, network, accounts) => {
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  }

  deployer.then(async () => {
    let bZxTo0x = await deployer.deploy(
      BZxTo0x,
      config["addresses"][network]["ZeroEx"]["ExchangeV1"],
      config["addresses"][network]["ZeroEx"]["ZRXToken"],
      config["addresses"][network]["ZeroEx"]["TokenTransferProxy"]
    );

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
      await deployer.deploy(ZeroExV2Helper, config["addresses"][network]["ZeroEx"]["ExchangeV2"]);
    }

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxTo0x/BZxTo0xV2 deploy: #done`);
  });
};
