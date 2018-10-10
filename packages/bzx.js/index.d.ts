import { BigNumber } from "@0xproject/utils";
import { TransactionObject, Tx } from "web3/eth/types";
import { Provider } from "web3/providers";
import { TransactionReceipt } from "web3/types";

export declare interface ILoanOrderValuesBase {
  bZxAddress: string;

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
  maxDurationUnixTimestampSec: string;
  expirationUnixTimestampSec: string;
}

export declare interface ILoanOrderFillable extends ILoanOrderValuesBase {
  loanOrderHash: string;
  lender: string;
  orderFilledAmount: number | string;
  orderCancelledAmount: number | string;
  orderTraderCount: number;
  addedUnixTimestampSec: number;
}

export declare interface ILoanOrderFillRequest extends ILoanOrderValuesBase {
  makerRole: number;
  salt: BigNumber | string;
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
  collateralTokenAddressFilled: string;
  positionTokenAddressFilled: string;
  loanTokenAddress: string;
  interestTokenAddress: string;

  loanTokenAmountFilled: BigNumber;
  collateralTokenAmountFilled: BigNumber;
  positionTokenAmountFilled: BigNumber;

  loanStartUnixTimestampSec: number;
  loanEndUnixTimestampSec: number;
  active: boolean;

  interestTotalAccrued: BigNumber;
  interestPaidSoFar: BigNumber;

  loanOrderHash: string;
}

export declare interface IZeroExOrder {
  signedOrder: any;
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
  constructor(provider: Provider, params: { networkId: number; addresses?: string[] });

  getLoanOrderHashAsync(order: ILoanOrderFillRequest): Promise<string>;

  isValidSignatureAsync({ account, orderHash, signature }): Promise<boolean>;

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

  getAllowance(params: { tokenAddress: string; ownerAddress: string; spenderAddress: string }): BigNumber;

  getBalance(params: { tokenAddress: string; ownerAddress: string }): BigNumber;

  getTokenList(): ITokenDescription[];

  getOracleList(): IOracleDescription[];

  isTradeSupported(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    oracleAddress: string;
    sourceTokenAmount: string;
  }): boolean;

  getConversionData(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    sourceTokenAmount: BigNumber;
    oracleAddress: string;
  }): { rate: BigNumber; amount: BigNumber };

  takeLoanOrderAsTrader(params: {
    order: ILoanOrderFillRequest;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  takeLoanOrderAsLender(params: {
    order: ILoanOrderFillRequest;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  pushLoanOrderOnChain(params: {
    order: ILoanOrderFillRequest;
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
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  cancelLoanOrderWithHash(params: {
    loanOrderHash: string;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  closeLoan(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getSingleLoan(params: { loanOrderHash: string; trader: string }): ILoanPositionState;

  getLoansForLender(params: { address: string; count: number; activeOnly: boolean }): ILoanPositionState[];

  getLoansForTrader(params: { address: string; count: number; activeOnly: boolean }): ILoanPositionState[];

  getSingleOrder(params: { loanOrderHash: string }): ILoanOrderFillable;

  getOrdersFillable(params: { start: number; count: number }): ILoanOrderFillable[];

  getOrdersForUser(params: { loanPartyAddress: string; start: number; count: number }): ILoanOrderFillable[];

  tradePositionWith0x(params: {
    order0x: IZeroExOrder;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;

  tradePositionWith0xV2(params: {
    order0x: IZeroExOrder;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;

  tradePositionWithOracle(params: {
    orderHash: string;
    tradeTokenAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;

  getInitialCollateralRequired(
    loanTokenAddress: string,
    collateralTokenAddress: string,
    oracleAddress: string,
    loanTokenAmountFilled: BigNumber | string,
    initialMarginAmount: BigNumber | string
  ): Promise<BigNumber>;

  changeCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

  depositCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    depositAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  withdrawExcessCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    withdrawAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;

  getProfitOrLoss(params: {
    loanOrderHash: string;
    trader: string;
  }): {
    isProfit: boolean;
    profitOrLoss: BigNumber;
    positionTokenAddress: string;
  };

  withdrawProfit(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;

  getInterest(params: {
    loanOrderHash: string;
    traderAddress: string;
  }): {
    lender: string;
    interestTokenAddress: string;
    interestTotalAccrued: BigNumber;
    interestPaidSoFar: BigNumber;
  };

  payInterest(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;

  getActiveLoans(params: { start: number; count: number }): ILoanOrderActive[];

  getMarginLevels(params: {
    loanOrderHash;
    trader;
  }): {
    initialMarginAmount: BigNumber;
    maintenanceMarginAmount: BigNumber;
    currentMarginAmount: BigNumber;
  };

  liquidateLoan(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

  transferToken(params: {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

  requestFaucetToken(params: {
    tokenAddress: string;
    receiverAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

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

  static getLoanOrderHashHex(order): string;

  static isValidSignature({ account, orderHash, signature }): boolean;
}

export default BZxJS;
