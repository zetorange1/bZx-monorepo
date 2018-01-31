import B0xJS from "b0x.js";  // eslint-disable-line

export const compileObject = (state, tokens) => {
  const getTokenInfo = address => tokens.filter(t => t.address === address)[0];
  const lendToken = getTokenInfo(state.lendTokenAddress);
  const interestToken = getTokenInfo(state.interestTokenAddress);
  const marginToken = getTokenInfo(state.marginTokenAddress);

  const { sendToRelayExchange } = state;

  return {
    b0x: `b0x_contract_address`,
    maker: `get_this_from_metamask`,
    networkId: 1,

    // addresses
    loanTokenAddress: state.lendTokenAddress,
    interestTokenAddress: state.interestTokenAddress,
    collateralTokenAddress: state.marginTokenAddress,
    feeRecipientAddress: sendToRelayExchange ? state.feeRecipientAddress : ``,
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

export const addSalt = obj => {
  const salt = B0xJS.generatePseudoRandomSalt();
  return {
    ...obj,
    salt
  };
};

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

// TODO - actually get the hash
// eslint-disable-next-line no-unused-vars, arrow-body-style
export const getHash = obj => {
  // const hash = B0xJS.getLendOrderHashHex(obj);
  // return hash;
  return `0xa0443e64b09e95208424ec3bf7c1b543b841de766877a8b76e25d76b6b42b970`;
};
