import B0xJS from "b0x.js"; // eslint-disable-line
import getNetworkId from "../../web3/getNetworkId";

export const compileObject = async (web3, state, account, b0x) => {
  const { sendToRelayExchange } = state;
  return {
    b0xAddress: b0x.addresses.B0x,
    makerAddress: account.toLowerCase(),
    makerRole: (state.role === `lender` ? 0 : 1).toString(),
    networkId: await getNetworkId(web3),

    // addresses
    loanTokenAddress: state.loanTokenAddress,
    interestTokenAddress: state.interestTokenAddress,
    collateralTokenAddress: state.collateralTokenAddress,
    feeRecipientAddress: sendToRelayExchange
      ? state.feeRecipientAddress
      : `0x0000000000000000000000000000000000000000`,
    oracleAddress: state.oracleAddress,

    // token amounts
    loanTokenAmount: state.loanTokenAmount.toString(),
    interestAmount: state.interestAmount.toString(),

    // margin amounts
    initialMarginAmount: state.initialMarginAmount.toString(),
    maintenanceMarginAmount: state.maintenanceMarginAmount.toString(),

    // relay fees
    lenderRelayFee: (sendToRelayExchange ? state.lenderRelayFee : 0).toString(),
    traderRelayFee: (sendToRelayExchange ? state.traderRelayFee : 0).toString(),

    // expiration date/time
    expirationUnixTimestampSec: state.expirationDate.unix().toString()
  };
};

export const addSalt = obj => {
  const salt = B0xJS.generatePseudoRandomSalt();
  return {
    ...obj,
    salt
  };
};

export const signOrder = async (orderHash, accounts, b0x) => {
  const signature = await b0x.signOrderHashAsync(
    orderHash,
    accounts[0].toLowerCase(),
    false
  );
  return signature;
};

export const getHash = obj => B0xJS.getLoanOrderHashHex(obj);
