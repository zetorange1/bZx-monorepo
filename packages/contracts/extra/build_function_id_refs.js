const web3 = require("web3-utils");

console.log("\nBZxOrderTaking functions");
getFuncId("cancelLoanOrder(address[8],uint256[11],bytes,uint256)");
getFuncId("cancelLoanOrderWithHash(bytes32,uint256)");
getFuncId("pushLoanOrderOnChain(address[8],uint256[11],bytes,bytes)");
getFuncId("preSign(address,address[8],uint256[11],bytes,bytes)");
getFuncId("preSignWithHash(address,bytes32,bytes)");
getFuncId("getLoanOrderHash(address[8],uint256[11],bytes)");
getFuncId("isValidSignature(address,bytes32,bytes)");
getFuncId("getInitialCollateralRequired(address,address,address,uint256,uint256)");
getFuncId("takeLoanOrderAsLender(address[8],uint256[11],bytes,bytes)");
getFuncId("takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,address,bool,bytes)");
getFuncId("takeLoanOrderOnChainAsLender(bytes32)");
getFuncId("takeLoanOrderOnChainAsTrader(bytes32,address,uint256,address,bool)");
getFuncId("takeLoanOrderOnChainAsTraderByDelegate(address,bytes32,address,uint256,address,bool)");

console.log("\nBZxOrderHistory functions");
getFuncId("getSingleOrder(bytes32)");
getFuncId("getOrdersFillable(uint256,uint256,address)");
getFuncId("getOrdersForUser(address,uint256,uint256,address)");
getFuncId("getSingleLoan(bytes32,address)");
getFuncId("getLoansForLender(address,uint256,bool)");
getFuncId("getLoansForTrader(address,uint256,bool)");
getFuncId("getActiveLoans(uint256,uint256)");
getFuncId("getLoanOrder(bytes32)");
getFuncId("getLoanOrderAux(bytes32)");
getFuncId("getLoanPosition(uint256)");

console.log("\nBZxTradePlacing functions");
getFuncId("tradePositionWithOracle(bytes32,address)");
getFuncId("tradePositionWith0x(bytes32,bytes,bytes)");
getFuncId("tradePositionWith0xV2(bytes32,(address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes)[],bytes[])");

console.log("\nBZxLoanMaintenance functions");
getFuncId("depositCollateral(bytes32,address,uint256)");
getFuncId("withdrawCollateral(bytes32,address,uint256)");
getFuncId("changeCollateral(bytes32,address)");
getFuncId("withdrawPosition(bytes32,uint256)");
getFuncId("depositPosition(bytes32,address,uint256)");
getFuncId("getPositionOffset(bytes32,address)");
getFuncId("changeTraderOwnership(bytes32,address)");
getFuncId("changeLenderOwnership(bytes32,address)");
getFuncId("updateLoanAsLender(bytes32,uint256,uint256)");
getFuncId("isPositionOpen(bytes32,address)");
getFuncId("setLoanOrderDesc(bytes32,string)");

console.log("\nBZxLoanHealth functions");
getFuncId("liquidatePosition(bytes32,address)");
getFuncId("closeLoanPartially(bytes32,uint256)");
getFuncId("closeLoan(bytes32)");
getFuncId("forceCloseLoan(bytes32,address)");
getFuncId("shouldLiquidate(bytes32,address)");

getFuncId("payInterestForOrder(bytes32)");
getFuncId("payInterestForOracle(address,address)");
getFuncId("getMarginLevels(bytes32,address)");
getFuncId("getLenderInterestForOracle(address,address,address)");
getFuncId("getLenderInterestForOrder(bytes32)");
getFuncId("getTraderInterestForLoan(bytes32,address)");


function getFuncId(funcStr) {
  console.log(
    "        targets[" +
      web3.sha3(funcStr).substr(0, 10) +
      '] = _target; // bytes4(keccak256("' +
      funcStr +
      '"))'
  );
}
