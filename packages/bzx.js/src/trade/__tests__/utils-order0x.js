import OrderUtils from "@0xproject/order-utils";
import { pathOr } from "ramda";
import * as signatureUtils from "../../signature/utils";
import * as constants from "../../core/constants";
import { protocol } from "../../../../config/secrets";
import { BZxJS } from "../../core/index";
import * as Trade0xUtils from "../utils/zeroEx";
import bZxJS from "../../core/__tests__/setup";

const zxConstants = pathOr(null, ["development", "ZeroEx"], protocol);

export const getOrder0x = ({
  web3,
  makerAddress,
  makerTokenAddress,
  takerTokenAddress
}) => ({
  maker: {
    address: makerAddress,
    token: {
      name: "Order0xMakerToken",
      symbol: "ABC",
      decimals: 18,
      address: makerTokenAddress
    },
    amount: web3.utils.toWei("100", "ether").toString(),
    feeAmount: web3.utils.toWei("0.002", "ether").toString()
  },
  taker: {
    address: "",
    token: {
      name: "Order0xTakerToken",
      symbol: "DEF",
      decimals: 18,
      address: takerTokenAddress
    },
    amount: web3.utils.toWei("90", "ether").toString(),
    feeAmount: web3.utils.toWei("0.0013", "ether").toString()
  },
  expiration: "2519061340",
  feeRecipient: constants.NULL_ADDRESS,
  salt: BZxJS.generatePseudoRandomSalt().toString(),
  exchangeContract: zxConstants.Exchange.toLowerCase(),
  networkId: 50
});

export const getOrder0xWithSignature = async ({
  web3,
  makerAddress,
  makerTokenAddress,
  takerTokenAddress
}) => {
  const order0x = getOrder0x({
    web3,
    makerAddress,
    makerTokenAddress,
    takerTokenAddress
  });
  const transformedOrder0x = Trade0xUtils.transform0xOrder(order0x);

  const orderHash0x = OrderUtils.getOrderHashHex(transformedOrder0x);
  const signature0x = (await bZxJS.signOrderHashAsync(
    orderHash0x,
    transformedOrder0x.maker
  )).substr(0, 132);

  // rsv is the one that will be valid during automated tests using web3 provider
  const ecSignatureRSV = signatureUtils.parseSignatureHexAsRSV(signature0x);
  return {
    ...order0x,
    signature: {
      ...ecSignatureRSV,
      hash: orderHash0x
    }
  };
};
