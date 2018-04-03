import B0xJS from "b0x.js"; // eslint-disable-line
import { toBigNumber } from "../../common/utils";
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
    loanTokenAmount: toBigNumber(state.loanTokenAmount, 1e18),
    interestAmount: toBigNumber(state.interestAmount, 1e18),

    // margin amounts
    initialMarginAmount: state.initialMarginAmount.toString(),
    maintenanceMarginAmount: state.maintenanceMarginAmount.toString(),

    // relay fees
    lenderRelayFee: toBigNumber(
      sendToRelayExchange ? state.lenderRelayFee : 0,
      1e18
    ),
    traderRelayFee: toBigNumber(
      sendToRelayExchange ? state.traderRelayFee : 0,
      1e18
    ),

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
    true
  );
  return signature;
};

export const getHash = obj => B0xJS.getLoanOrderHashHex(obj);
