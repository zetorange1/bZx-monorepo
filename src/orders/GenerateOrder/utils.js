import B0xJS from "b0x.js";  // eslint-disable-line

export const compileObject = (state, tokens) => {
  const getTokenInfo = address => tokens.filter(t => t.address === address)[0];
  const lendToken = getTokenInfo(state.lendTokenAddress);
  const interestToken = getTokenInfo(state.interestTokenAddress);
  const marginToken = getTokenInfo(state.marginTokenAddress);

  const { sendToRelayExchange } = state;

  return {
    makerAddress: `get_this_from_metamask`,
    b0xContract: `b0x_contract_address`,
    networkId: 1,

    // token data
    lendToken,
    interestToken,
    marginToken,

    // token amounts
    lendTokenAmount: state.lendTokenAmount.toString(),
    interestAmount: state.interestAmount.toString(),

    // margin amounts
    initialMarginAmount: state.initialMarginAmount.toString(),
    liquidationMarginAmount: state.liquidationMarginAmount.toString(),

    // expiration date/time
    expirationUnixTimestampSec: state.expirationDate.unix().toString(),

    // oracle
    oracleAddress: state.oracleAddress,

    // relay/exchange settings
    feeRecipientAddress: sendToRelayExchange ? state.feeRecipientAddress : ``,
    lenderRelayFee: (sendToRelayExchange ? state.lenderRelayFee : 0).toString(),
    traderRelayFee: (sendToRelayExchange ? state.traderRelayFee : 0).toString()
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
