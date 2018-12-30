var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var TradePlacing_Oracle = artifacts.require("TradePlacing_Oracle");
var TradePlacing_ZeroEx = artifacts.require("TradePlacing_ZeroEx");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    await deployer.deploy(TradePlacing_Oracle);
    await bZxProxy.replaceContract(TradePlacing_Oracle.address);

    await deployer.deploy(TradePlacing_ZeroEx);
    await bZxProxy.replaceContract(TradePlacing_ZeroEx.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxTradePlacing0xV2 deploy: #done`);
  });
};
