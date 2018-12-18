import { BigNumber } from "@0xproject/utils";
import { TransactionObject, Tx } from "web3/eth/types";
import { TransactionReceipt } from "web3/types";
import Web3 = require("web3");

export declare interface ILoanOrderValuesBase {
  makerAddress: string;
  loanTokenAddress: string;
  interestTokenAddress: string;
  collateralTokenAddress: string;
  feeRecipientAddress: string;
  oracleAddress: string;

  loanTokenAmount: number | string;
  interestAmount: number | string;
  initialMarginAmount: number | string;
  maintenanceMarginAmount: number | string;
  lenderRelayFee: number | string;
  traderRelayFee: number | string;
  maxDurationUnixTimestampSec: number | string;
  expirationUnixTimestampSec: number | string;
}

export declare interface ILoanOrderFillable extends ILoanOrderValuesBase {
  loanOrderHash: string;
  lender: string;
  orderFilledAmount: number;
  orderCancelledAmount: number;
  orderTraderCount: number;
  addedUnixTimestampSec: number;
}

export declare interface ILoanOrderFillRequest extends ILoanOrderValuesBase {
  bZxAddress: string;

  makerRole: number;
  salt: string;
  signature: string;
}

export declare interface ILoanOrderActive {
  loanOrderHash: string;
  trader: string;
  loanEndUnixTimestampSec: number;
}

export declare interface ILoanPositionState {
  lender: string;
  trader: string;

  loanOrderHash: string;
  loanStartUnixTimestampSec: number;
  loanEndUnixTimestampSec: number;
  active: number;

  loanTokenAddress: string;
  loanTokenAmountFilled: number;

  collateralTokenAddressFilled: string;
  collateralTokenAmountFilled: number;

  positionTokenAddressFilled: number;
  positionTokenAmountFilled: number;

  interestTokenAddress: string;
  interestTotalAccrued: number;
  interestLastPaidDate: number;
  interestPaidSoFar: number;
}

export declare interface IZeroExOrder {
  exchangeContractAddress: string;
  expirationUnixTimestampSec: number;
  feeRecipient: string;
  maker: string;
  makerFee: number;
  makerTokenAddress: string;
  makerTokenAmount: number;
  salt: string;
  taker: string;
  takerFee: number;
  takerTokenAddress: string;
  takerTokenAmount: number;
}

export declare interface IZeroExV2Order {
  senderAddress: string;
  makerAddress: string;
  takerAddress: string;
  makerFee: string;
  takerFee: string;
  makerAssetAmount: string;
  takerAssetAmount: string;
  makerAssetData: any;
  takerAssetData: any;
  salt: string;
  exchangeAddress: string;
  feeRecipientAddress: string;
  expirationTimeSeconds: string;
}

export declare interface ITokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export declare interface IZeroExV2OrderMetadata {
  makerToken: ITokenMetadata;
  takerToken: ITokenMetadata;
}

export declare interface ISignatureParams {
  v: number;
  r: Buffer;
  s: Buffer;
}

export declare interface IZeroExOrderSigned extends IZeroExOrder {
  ecSignature: ISignatureParams;
}

export declare interface IZeroExV2OrderSigned extends IZeroExV2Order {
  signature: string;
}

export declare interface IZeroExTradeRequest {
  signedOrder: IZeroExOrderSigned;
}

export declare interface IZeroExV2TradeRequest {
  signedOrder: IZeroExV2OrderSigned;
  metadata: IZeroExV2OrderMetadata;
}

export declare interface IConversionData {
  rate: string;
  amount: string;
}

export declare interface IMarginLevel {
  initialMarginAmount: string;
  maintenanceMarginAmount: string;
  currentMarginAmount: string;
}

export declare interface IInterestStatus {
  lender: string;
  interestTokenAddress: string;
  interestTotalAccrued: string;
  interestPaidSoFar: string;
}

export declare interface IProfitStatus {
  isProfit: boolean;
  profitOrLoss: string;
  positionTokenAddress: string;
}

export declare interface ITokenDescription {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  url: string;
}

export declare interface IOracleDescription {
  address: string;
  name: string;
}

export declare class BZxJS {
  constructor(web3: Web3, params: { networkId: number; addresses?: string[] });

  getLoanOrderHashAsync(order: ILoanOrderFillRequest): Promise<string>;

  isValidSignatureAsync(params: { account: string; orderHash: string; signature: string }): Promise<boolean>;

  signOrderHashAsync(
    orderHash: string,
    signerAddress: string,
    shouldAddPersonalMessagePrefix: boolean
  ): Promise<string>;

  setAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    amountInBaseUnits: BigNumber | string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  setAllowanceUnlimited(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  resetAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getAllowance(params: { tokenAddress: string; ownerAddress: string; spenderAddress: string }): Promise<BigNumber>;

  getBalance(params: { tokenAddress: string; ownerAddress: string }): Promise<BigNumber>;

  getTokenList(): Promise<ITokenDescription[]>;

  getOracleList(): Promise<IOracleDescription[]>;

  isTradeSupported(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    sourceTokenAmount: string;
    oracleAddress: string;
  }): Promise<boolean>;

  getConversionData(
    sourceTokenAddress: string,
    destTokenAddress: string,
    sourceTokenAmount: BigNumber,
    oracleAddress: string
  ): Promise<IConversionData>;

  takeLoanOrderAsTrader(params: {
    order: ILoanOrderFillRequest;
    oracleData: any;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  takeLoanOrderAsLender(params: {
    order: ILoanOrderFillRequest;
    oracleData: any;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  pushLoanOrderOnChain(params: {
    order: ILoanOrderFillRequest;
    oracleData: any;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  takeLoanOrderOnChainAsTrader(params: {
    loanOrderHash: string;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  takeLoanOrderOnChainAsLender(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  cancelLoanOrder(params: {
    order: ILoanOrderFillRequest;
    oracleData: any;
    cancelLoanTokenAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  cancelLoanOrderWithHash(params: {
    loanOrderHash: string;
    cancelLoanTokenAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  closeLoan(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getSingleLoan(params: { loanOrderHash: string; trader: string }): Promise<ILoanPositionState>;

  getLoansForLender(params: { address: string; count: number; activeOnly: boolean }): Promise<ILoanPositionState[]>;

  getLoansForTrader(params: { address: string; count: number; activeOnly: boolean }): Promise<ILoanPositionState[]>;

  getSingleOrder(params: { loanOrderHash: string }): Promise<ILoanOrderFillable>;

  getOrdersFillable(params: { start: number; count: number }): Promise<ILoanOrderFillable[]>;

  getOrdersForUser(params: { loanPartyAddress: string; start: number; count: number }): Promise<ILoanOrderFillable[]>;

  tradePositionWith0x(params: {
    order0x: IZeroExTradeRequest;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  tradePositionWith0xV2(params: {
    order0x: IZeroExV2TradeRequest;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  tradePositionWithOracle(params: {
    orderHash: string;
    tradeTokenAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getInitialCollateralRequired(
    loanTokenAddress: string,
    collateralTokenAddress: string,
    oracleAddress: string,
    loanTokenAmountFilled: string,
    initialMarginAmount: string
  ): Promise<string>;

  changeCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  depositCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    depositAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  withdrawExcessCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    withdrawAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getProfitOrLoss(params: { loanOrderHash: string; trader: string }): Promise<IProfitStatus>;

  withdrawProfit(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getInterest(params: { loanOrderHash: string; trader: string }): Promise<IInterestStatus>;

  payInterest(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getActiveLoans(params: { start: number; count: number }): Promise<ILoanOrderActive[]>;

  getMarginLevels(params: { loanOrderHash: string; trader: string }): Promise<IMarginLevel>;

  liquidateLoan(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  transferToken(params: {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  requestFaucetToken(params: {
    tokenAddress: string;
    receiverAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  wrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  unwrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  static generatePseudoRandomSalt(): BigNumber;

  static noop(): void;

  static toChecksumAddress(address: string): string;

  static getLoanOrderHashHex(order: ILoanOrderFillRequest): string;

  static isValidSignature(params: { account: string; orderHash: string; signature: string }): boolean;
}

export default BZxJS;
