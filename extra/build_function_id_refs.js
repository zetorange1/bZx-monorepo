
const web3 = require("web3-utils");

console.log("\nBZxOrderTaking functions");
getFuncId("takeLoanOrderAsTrader(address[6],uint256[9],address,uint256,bytes)");
getFuncId("takeLoanOrderAsLender(address[6],uint256[9],bytes)");
getFuncId("pushLoanOrderOnChain(address[6],uint256[9],bytes)");
getFuncId("takeLoanOrderOnChainAsTrader(bytes32,address,uint256)");
getFuncId("takeLoanOrderOnChainAsLender(bytes32)");
getFuncId("cancelLoanOrder(address[6],uint256[9],uint256)");
getFuncId("cancelLoanOrder(bytes32,uint256)");
getFuncId("getLoanOrderHash(address[6],uint256[9])");
getFuncId("isValidSignature(address,bytes32,bytes)");
getFuncId("getInitialCollateralRequired(address,address,address,uint256,uint256)");
getFuncId("getUnavailableLoanTokenAmount(bytes32)");

console.log("\nBZxOrderHistory functions");
getFuncId("getSingleOrder(bytes32)");
getFuncId("getOrdersFillable(uint256,uint256)");
getFuncId("getOrdersForUser(address,uint256,uint256)");
getFuncId("getSingleLoan(bytes32,address)");
getFuncId("getLoansForLender(address,uint256,bool)");
getFuncId("getLoansForTrader(address,uint256,bool)");
getFuncId("getActiveLoans(uint256,uint256)");

console.log("\nBZxTradePlacing functions");
getFuncId("tradePositionWith0x(bytes32,bytes,bytes)");
getFuncId("tradePositionWithOracle(bytes32,address)");

console.log("\nBZxTradePlacing0xV2 functions");
getFuncId("tradePositionWith0xV2(bytes32,(address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes)[],bytes[])");

console.log("\nBZxLoanMaintenance functions");
getFuncId("depositCollateral(bytes32,address,uint256)");
getFuncId("withdrawExcessCollateral(bytes32,address,uint256)");
getFuncId("changeCollateral(bytes32,address)");
getFuncId("withdrawProfit(bytes32)");
getFuncId("getProfitOrLoss(bytes32,address)");

console.log("\nBZxLoanHealth functions");
getFuncId("payInterest(bytes32,address)");
getFuncId("liquidatePosition(bytes32,address)");
getFuncId("closeLoan(bytes32)");
getFuncId("forceCloanLoan(bytes32,address)");
getFuncId("shouldLiquidate(bytes32,address)");
getFuncId("getMarginLevels(bytes32,address)");
getFuncId("getInterest(bytes32,address)");

console.log("\nBZxOracle functions");
getFuncId("didTakeOrder(bytes32,address[4],uint256[4])");
getFuncId("didTradePosition(bytes32,address,address,uint256,uint256)");
getFuncId("didPayInterest(bytes32,address,address,address,uint256,bool,uint256)");
getFuncId("didDepositCollateral(bytes32,address,uint256)");
getFuncId("didWithdrawCollateral(bytes32,address,uint256)");
getFuncId("didChangeCollateral(bytes32,address,uint256)");
getFuncId("didWithdrawProfit(bytes32,address,uint256,uint256)");
getFuncId("didCloseLoan(bytes32,address,bool,uint256)");
getFuncId("doManualTrade(address,address,uint256)");
getFuncId("doTrade(address,address,uint256)");
getFuncId("verifyAndLiquidate(address,address,address,uint256,uint256,uint256,uint256)");
getFuncId("processCollateral(address,address,uint256,uint256,uint256,uint256,bool)");
getFuncId("shouldLiquidate(bytes32,address,address,address,address,uint256,uint256,uint256,uint256)");
getFuncId("getTradeRate(address,address)");
getFuncId("getProfitOrLoss(address,address,uint256,uint256)");
getFuncId("getCurrentMarginAmount(address,address,address,uint256,uint256,uint256)");
getFuncId("isTradeSupported(address,address,uint256)");



function getFuncId(funcStr) {
    console.log("targets["+web3.sha3(funcStr).substr(0,10)+"] = _target; // bytes4(keccak256(\""+funcStr+"\"))");
}

