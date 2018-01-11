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
  // eslint-disable-next-line no-undef
  const salt = getLendOrderSalt();
  return {
    ...obj,
    salt
  };
};

export const signOrder = obj => {
  // eslint-disable-next-line no-undef
  const signature = getSignature();
  return {
    ...obj,
    signature
  };
};
