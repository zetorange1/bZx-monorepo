import B0xJS from "b0x.js";  // eslint-disable-line

export const compileObject = state => {
  const { sendToRelayExchange } = state;
  return {
    b0x: `0x0000000000000000000000000000000000000000`,
    maker: `0x0000000000000000000000000000000000000000`,
    networkId: 1,

    // addresses
    loanTokenAddress: state.lendTokenAddress,
    interestTokenAddress: state.interestTokenAddress,
    collateralTokenAddress: state.marginTokenAddress,
    feeRecipientAddress: sendToRelayExchange
      ? state.feeRecipientAddress
      : `0x0000000000000000000000000000000000000000`,
    oracleAddress: state.oracleAddress,

    // token amounts
    loanTokenAmount: state.lendTokenAmount.toString(),
    interestAmount: state.interestAmount.toString(),

    // margin amounts
    initialMarginAmount: state.initialMarginAmount.toString(),
    liquidationMarginAmount: state.liquidationMarginAmount.toString(),

    // relay fees
    lenderRelayFee: (sendToRelayExchange ? state.lenderRelayFee : 0).toString(),
    traderRelayFee: (sendToRelayExchange ? state.traderRelayFee : 0).toString(),

    // expiration date/time
    expirationUnixTimestampSec: state.expirationDate.unix().toString()
  };
};

export const addSalt = obj =>
  // TODO - use the salt generator from B0xJS
  // const salt = B0xJS.generatePseudoRandomSalt();
  ({
    ...obj,
    salt: Math.random().toString()
  });

// TODO - actually get signature
export const signOrder = obj => {
  // const signature = getSignature();
  const signature = {
    v: 27,
    r: `0x_temp`,
    s: `0x_temp`,
    hash: `0x_temp`
  };
  return {
    ...obj,
    signature
  };
};

export const getHash = obj => B0xJS.getLoanOrderHashHex(obj);
// return `0xa0443e64b09e95208424ec3bf7c1b543b841de766877a8b76e25d76b6b42b970`;
