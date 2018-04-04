import { assert } from "@0xproject/assert";
import _ from "lodash";
import { constants } from "0x.js/lib/src/utils/constants";
import { signatureUtils } from "0x.js/lib/src/utils/signature_utils";
import { BigNumber } from "@0xproject/utils";
import * as ethUtil from "ethereumjs-util";
import { schemas } from "../schemas/b0x_json_schemas";
import * as utils from "./utils";
import EIP20 from "../contracts/EIP20.json";
import * as allowance from "../allowance";
import * as oracles from "../oracles";
import * as fill from "../fill";
import * as Addresses from "../addresses";
import * as orderHistory from "../orderHistory";
import * as transfer from "../transfer";

let Web3 = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line global-require
  Web3 = require("web3");
}

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  /* On Metamask, provider.host is undefined 
  Force users to provide host url */
  constructor(
    provider,
    { networkId, addresses = Addresses.getAddresses(networkId) } = {}
  ) {
    if (!networkId)
      throw new Error("Missing networkId. Provide a networkId param.");

    assert.isWeb3Provider("provider", provider);
    this.web3 = new Web3(provider);
    this.addresses = addresses;
    this.networkId = networkId;
  }

  static getLoanOrderHashHex(order) {
    utils.doesConformToSchema("loanOrder", order, schemas.loanOrderSchema);
    const orderHashHex = utils.getLoanOrderHashHex(order);
    return orderHashHex;
  }
  getLoanOrderHashAsync = async props =>
    utils.getLoanOrderHashAsync(this, props);

  isValidSignatureAsync = async props =>
    utils.isValidSignatureAsync(this, props);

  async signOrderHashAsync(
    orderHash,
    signerAddress,
    // Metamask provider needs shouldAddPersonalMessagePrefix to be true
    shouldAddPersonalMessagePrefix
  ) {
    assert.isHexString("orderHash", orderHash);
    assert.isETHAddressHex("signerAddress", signerAddress);
    const nodeVersion = this.web3.version.node;
    const isParityNode = _.includes(nodeVersion, "Parity");
    const isTestRpc = _.includes(nodeVersion, "TestRPC");
    let signature = null;

    if (isParityNode || isTestRpc) {
      // Parity and TestRpc nodes add the personalMessage prefix itself
      signature = this.web3.eth.sign(signerAddress, orderHash);
    } else {
      let msgHashHex = orderHash;
      if (shouldAddPersonalMessagePrefix) {
        const orderHashBuff = ethUtil.toBuffer(orderHash);
        const msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
        msgHashHex = ethUtil.bufferToHex(msgHashBuff);
      }
      signature = await this.web3.eth.sign(msgHashHex, signerAddress);
    }
    // return signature;

    // HACK: There is no consensus on whether the signatureHex string should be formatted as
    // v + r + s OR r + s + v, and different clients (even different versions of the same client)
    // return the signature params in different orders. In order to support all client implementations,
    // we parse the signature in both ways, and evaluate if either one is a valid signature.
    const validVParamValues = [27, 28];
    const ecSignatureVRS = signatureUtils.parseSignatureHexAsVRS(signature);
    if (_.includes(validVParamValues, ecSignatureVRS.v)) {
      const isValidVRSSignature = signatureUtils.isValidSignature(
        orderHash,
        ecSignatureVRS,
        signerAddress
      );
      if (isValidVRSSignature) {
        return ethUtil.toRpcSig(
          ecSignatureVRS.v,
          ecSignatureVRS.r,
          ecSignatureVRS.s
        );
      }
    }

    const ecSignatureRSV = signatureUtils.parseSignatureHexAsRSV(signature);
    if (_.includes(validVParamValues, ecSignatureRSV.v)) {
      const isValidRSVSignature = signatureUtils.isValidSignature(
        orderHash,
        ecSignatureRSV,
        signerAddress
      );
      if (isValidRSVSignature) {
        return ethUtil.toRpcSig(
          ecSignatureRSV.v,
          ecSignatureRSV.r,
          ecSignatureRSV.s
        );
      }
    }

    throw new Error("InvalidSignature");
  }

  setAllowance = async (...props) => allowance.setAllowance(this, ...props);

  setAllowanceUnlimited = async props =>
    this.setAllowance({
      ...props,
      amountInBaseUnits: constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
    });

  resetAllowance = async props =>
    this.setAllowance({
      ...props,
      amountInBaseUnits: new BigNumber(0)
    });

  getAllowance = async (...props) => allowance.getAllowance(this, ...props);

  getBalance = async ({ tokenAddress, ownerAddress }) => {
    assert.isETHAddressHex("ownerAddress", ownerAddress);
    assert.isETHAddressHex("tokenAddress", tokenAddress);

    const tokenContract = await utils.getContractInstance(
      this.web3,
      EIP20.abi,
      tokenAddress
    );
    const balance = await tokenContract.methods.balanceOf(ownerAddress).call();
    return new BigNumber(balance);
  };

  getOracleList = async () => oracles.getOracleList(this);
  isTradeSupported = async (...props) =>
    oracles.isTradeSupported(this, ...props);

  takeLoanOrderAsLender = async (...props) =>
    fill.takeLoanOrderAsLender(this, ...props);

  takeLoanOrderAsTrader = async (...props) =>
    fill.takeLoanOrderAsTrader(this, ...props);

  getOrders = async (...props) => orderHistory.getOrders(this, ...props);
  getLoanPositions = async (...props) =>
    orderHistory.getLoanPositions(this, ...props);

  transferToken = async (...props) => transfer.transferToken(this, ...props);
}
