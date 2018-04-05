import { assert } from "@0xproject/assert";
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import { schemas } from "../schemas/b0x_json_schemas";
import * as utils from "./utils";
import EIP20 from "../contracts/EIP20.json";
import * as allowance from "../allowance";
import * as oracles from "../oracles";
import * as fill from "../fill";
import * as Addresses from "../addresses";
import * as orderHistory from "../orderHistory";
import * as transfer from "../transfer";
import * as signature from "../signature";

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

  static isValidSignature = props => signature.isValidSignature(props);

  isValidSignatureAsync = async props =>
    signature.isValidSignatureAsync(this, props);

  signOrderHashAsync = async (...props) =>
    signature.signOrderHashAsync(this, ...props);

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
