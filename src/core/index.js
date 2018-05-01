import { assert } from "@0xproject/assert";
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import { schemas } from "../schemas/b0x_json_schemas";
import * as utils from "./utils";
import * as tokenRegistry from "../tokenRegistry";
import EIP20 from "../contracts/EIP20.json";
import * as allowance from "../allowance";
import * as oracles from "../oracles";
import * as fill from "../fill";
import * as Addresses from "../addresses";
import * as orderHistory from "../orderHistory";
import * as transfer from "../transfer";
import * as signature from "../signature";
import * as Errors from "./constants/errors";
import * as trade from "../trade";
import * as loanHealth from "../loanHealth";

let Web3 = null;
if (typeof window !== "undefined") {
  // eslint-disable-next-line global-require
  Web3 = require("web3");
}

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;
  static toChecksumAddress = utils.toChecksumAddress;

  /* On Metamask, provider.host is undefined
  Force users to provide host url */
  constructor(
    provider,
    { networkId, addresses = Addresses.getAddresses(networkId) } = {}
  ) {
    if (!networkId) throw new Error(Errors.NoNetworkId);

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

  setAllowance = (...props) => allowance.setAllowance(this, ...props);

  setAllowanceUnlimited = props =>
    this.setAllowance({
      ...props,
      amountInBaseUnits: constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS
    });

  resetAllowance = props =>
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

  getTokenList = async () => tokenRegistry.getTokenList(this);

  getOracleList = async () => oracles.getOracleList(this);
  isTradeSupported = async (...props) =>
    oracles.isTradeSupported(this, ...props);

  takeLoanOrderAsLender = (...props) =>
    fill.takeLoanOrderAsLender(this, ...props);

  takeLoanOrderAsTrader = (...props) =>
    fill.takeLoanOrderAsTrader(this, ...props);

  getInitialCollateralRequired = async (...props) =>
    fill.getInitialCollateralRequired(this, ...props);

  getOrders = async (...props) => orderHistory.getOrders(this, ...props);
  getLoansForLender = async (...props) =>
    orderHistory.getLoansForLender(this, ...props);
  getLoansForTrader = async (...props) =>
    orderHistory.getLoansForTrader(this, ...props);

  transferToken = (...props) => transfer.transferToken(this, ...props);

  tradePositionWith0x = (...props) => trade.tradePositionWith0x(this, ...props);

  changeCollateral = (...props) => loanHealth.changeCollateral(this, ...props);

  depositCollateral = (...props) =>
    loanHealth.depositCollateral(this, ...props);

  tradePositionWithOracle = (...props) =>
    trade.tradePositionWithOracle(this, ...props);
}
