import * as constants from "../../core/constants";

export const transform0xOrder = ({
  signedOrder
}) => ({
  exchangeContractAddress: signedOrder.exchangeContractAddress,
  expirationUnixTimestampSec: signedOrder.expirationUnixTimestampSec,
  feeRecipient: signedOrder.feeRecipient,
  maker: signedOrder.maker,
  makerFee: signedOrder.makerFee,
  makerTokenAddress: signedOrder.makerTokenAddress,
  makerTokenAmount: signedOrder.makerTokenAmount,
  salt: signedOrder.salt,
  taker: signedOrder.taker || constants.NULL_ADDRESS,
  takerFee: signedOrder.takerFee,
  takerTokenAddress: signedOrder.takerTokenAddress,
  takerTokenAmount: signedOrder.takerTokenAmount
});
