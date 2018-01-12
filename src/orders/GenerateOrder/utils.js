import { generatePseudoRandomSalt } from "b0x.js";  // eslint-disable-line
import { getTokenInfo } from ".././../common/tokens";

export const compileObject = state => {
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
    lendTokenAmount: state.lendTokenAmount,
    interestAmount: state.interestAmount,

    // margin amounts
    initialMarginAmount: state.initialMarginAmount,
    liquidationMarginAmount: state.liquidationMarginAmount,

    // expiration date/time
    expirationUnixTimestampSec: state.expirationDate.unix(),

    // relay/exchange settings
    feeRecipientAddress: sendToRelayExchange ? state.feeRecipientAddress : ``,
    lenderRelayFee: sendToRelayExchange ? state.lenderRelayFee : 0,
    traderRelayFee: sendToRelayExchange ? state.traderRelayFee : 0
  };
};

export const addSalt = obj => {
  const salt = generatePseudoRandomSalt();
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
export const getHash = () =>
  `0xa0443e64b09e95208424ec3bf7c1b543b841de766877a8b76e25d76b6b42b970`;
