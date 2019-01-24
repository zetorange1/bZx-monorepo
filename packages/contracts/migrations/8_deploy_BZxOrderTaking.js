var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var OrderHistory_MiscFunctions = artifacts.require("OrderHistory_MiscFunctions");
var OrderTaking_MiscFunctions = artifacts.require("OrderTaking_MiscFunctions");
var OrderTaking_takeLoanOrderAsLender = artifacts.require("OrderTaking_takeLoanOrderAsLender");
var OrderTaking_takeLoanOrderAsTrader = artifacts.require("OrderTaking_takeLoanOrderAsTrader");
var OrderTaking_takeLoanOrderOnChainAsLender = artifacts.require("OrderTaking_takeLoanOrderOnChainAsLender");
var OrderTaking_takeLoanOrderOnChainAsTrader = artifacts.require("OrderTaking_takeLoanOrderOnChainAsTrader");
var OrderTaking_takeLoanOrderOnChainAsTraderByDelegate = artifacts.require("OrderTaking_takeLoanOrderOnChainAsTraderByDelegate");

const path = require("path");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    await deployer.deploy(OrderTaking_MiscFunctions);
    await bZxProxy.replaceContract(OrderTaking_MiscFunctions.address);

    await deployer.deploy(OrderTaking_takeLoanOrderAsLender);
    await bZxProxy.replaceContract(OrderTaking_takeLoanOrderAsLender.address);

    await deployer.deploy(OrderTaking_takeLoanOrderAsTrader);
    await bZxProxy.replaceContract(OrderTaking_takeLoanOrderAsTrader.address);

    await deployer.deploy(OrderTaking_takeLoanOrderOnChainAsLender);
    await bZxProxy.replaceContract(OrderTaking_takeLoanOrderOnChainAsLender.address);

    await deployer.deploy(OrderTaking_takeLoanOrderOnChainAsTrader);
    await bZxProxy.replaceContract(OrderTaking_takeLoanOrderOnChainAsTrader.address);

    await deployer.deploy(OrderTaking_takeLoanOrderOnChainAsTraderByDelegate);
    await bZxProxy.replaceContract(OrderTaking_takeLoanOrderOnChainAsTraderByDelegate.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZxOrderTakingOnChain deploy: #done`);
  });
};
