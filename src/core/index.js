import { assert } from "@0xproject/assert";
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import * as ethUtil from "ethereumjs-util";
import { schemas } from "../schemas/b0x_json_schemas";
import * as utils from "./utils";
import contracts from "../contracts";
import * as allowance from "../allowance";
import * as oracles from "../oracles";
import * as fill from "../fill";
import * as Addresses from "../addresses";
import * as orderHistory from "../orderHistory";
import * as transfer from "../transfer";

const erc20Abi = contracts.EIP20.abi;

let Web3 = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line global-require
  Web3 = require("web3");
}

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(provider, { addresses = Addresses.getAddresses() } = {}) {
    assert.isWeb3Provider("provider", provider);
    this.web3 = new Web3(provider);
    this.addresses = addresses;
  }

  static getLoanOrderHashHex(order) {
    utils.doesConformToSchema("loanOrder", order, schemas.loanOrderSchema);
    const orderHashHex = utils.getLoanOrderHashHex(order);
    return orderHashHex;
  }

  isValidSignature = async props => utils.isValidSignature(this.web3, props);

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

  resetAllowance = async props =>
    this.setAllowance({
      ...props,
      amountInBaseUnits: new BigNumber(0)
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

  takeLoanOrderAsTrader = async (...props) =>
    fill.takeLoanOrderAsTrader(this.web3, ...props);

  getOrders = async (...props) => orderHistory.getOrders(this.web3, ...props);

  transferToken = async (...props) =>
    transfer.transferToken(this.web3, ...props);
}
