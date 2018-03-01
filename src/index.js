import { assert } from "@0xproject/assert";
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import * as ethUtil from "ethereumjs-util";
import { schemas } from "./schemas/b0x_json_schemas";
import * as utils from "./utils";
import erc20Abi from "./contracts/ERC20.abi.json";
import * as allowance from "./allowance";
import * as oracles from "./oracles";
import * as fill from "./fill";

let Web3 = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line global-require
  Web3 = require("web3");
}

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(provider) {
    assert.isWeb3Provider("provider", provider);
    this.web3 = new Web3(provider);
  }

  static getLoanOrderHashHex(order) {
    utils.doesConformToSchema("loanOrder", order, schemas.loanOrderSchema);
    const orderHashHex = utils.getLoanOrderHashHex(order);
    return orderHashHex;
  }

  async signOrderHashAsync(
    orderHash,
    signerAddress,
    shouldAddPersonalMessagePrefix
  ) {
    assert.isHexString("orderHash", orderHash);
    let msgHashHex = orderHash;
    if (shouldAddPersonalMessagePrefix) {
      const orderHashBuff = ethUtil.toBuffer(orderHash);
      const msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      msgHashHex = ethUtil.bufferToHex(msgHashBuff);
    }
    const signature = await this.web3.eth.sign(msgHashHex, signerAddress);
    return signature;
  }

  setAllowance = async (...props) =>
    allowance.setAllowance(this.web3, ...props);

  setAllowanceUnlimited = async props =>
    this.setAllowance({
      ...props,
      amountInBaseUnits: constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
    });

  getAllowance = async ({ tokenAddress, ownerAddress, spenderAddress }) =>
    allowance.getAllowance(this.web3, {
      tokenAddress,
      ownerAddress,
      spenderAddress
    });

  getBalance = async ({ tokenAddress, ownerAddress }) => {
    assert.isETHAddressHex("ownerAddress", ownerAddress);
    assert.isETHAddressHex("tokenAddress", tokenAddress);

    const tokenContract = await utils.getContractInstance(
      this.web3,
      erc20Abi,
      tokenAddress
    );
    const balance = await tokenContract.methods.balanceOf(ownerAddress).call();
    return new BigNumber(balance);
  };

  getOracleList = async () => oracles.getOracleList(this.web3);
  isTradeSupported = async (...props) =>
    oracles.isTradeSupported(this.web3, ...props);

  takeLoanOrderAsLender = async (...props) =>
    fill.takeLoanOrderAsLender(this.web3, ...props);
}
