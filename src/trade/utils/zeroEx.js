import { constants } from "0x.js/lib/src/utils/constants";

export const transform0xOrder = ({
  exchangeContract,
  expiration,
  feeRecipient,
  salt,
  maker,
  taker
}) => ({
  exchangeContractAddress: exchangeContract,
  expirationUnixTimestampSec: expiration,
  feeRecipient,
  maker: maker.address,
  makerFee: maker.feeAmount,
  makerTokenAddress: maker.token.address,
  makerTokenAmount: maker.amount,
  salt,
  taker: taker.address || constants.NULL_ADDRESS,
  takerFee: taker.feeAmount,
  takerTokenAddress: taker.token.address,
  takerTokenAmount: taker.amount
});
