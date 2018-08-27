import { BigNumber } from "@0xproject/utils";
import { Provider, TransactionObject, Tx } from "web3/types";

export declare interface IOrder {
  makerAddress: string;
  loanTokenAddress: string;
  interestTokenAddress: string;
  collateralTokenAddress: string;
  feeRecipientAddress: string;
  oracleAddress: string;
  loanTokenAmount: number;
  interestAmount: number;
  initialMarginAmount: number;
  maintenanceMarginAmount: number;
  lenderRelayFee: number;
  traderRelayFee: number;
  maxDurationUnixTimestampSec: number;
  expirationUnixTimestampSec: number;
  loanOrderHash: string;
  lender: string;
  orderFilledAmount: number;
  orderCancelledAmount: number;
  orderTraderCount: number;
  addedUnixTimestampSec: number;
  makerRole: number;
  salt?: string;
  signature?: string;
}

export declare interface IActiveLoan {
  loanOrderHash: string;
  trader: string;
  loanEndUnixTimestampSec: number;
}

export declare class BZxJS {
  constructor(
    provider: Provider,
    params: { networkId: number; addresses?: string[] }
  );

  getLoanOrderHashAsync(order): Promise<string>;

  isValidSignatureAsync({ account, orderHash, signature }): Promise<boolean>;
  signOrderHashAsync(
    orderHash: string,
    signerAddress: string,
    shouldAddPersonalMessagePrefix
  ): Promise<string>;

  setAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    amountInBaseUnits: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
  setAllowanceUnlimited(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
  resetAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
  getAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
  }): BigNumber;

  getBalance(params: { tokenAddress: string; ownerAddress: string }): BigNumber;

  getTokenList(): string[];

  getOracleList(): { address: string; name: string }[];
  isTradeSupported(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    oracleAddress: string;
  }): boolean;
  getConversionData(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    sourceTokenAmount: BigNumber;
    oracleAddress: string;
  }): { rate: BigNumber; amount: BigNumber };

  takeLoanOrderAsLender(params: {
    order: Partial<IOrder>;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
  takeLoanOrderAsTrader(params: {
    order: Partial<IOrder>;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;

  pushLoanOrderOnChain(params: {
    order: Partial<IOrder>;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<any> | TransactionObject<any>;
  takeLoanOrderOnChainAsTrader(params: {
    loanOrderHash: string;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<any> | TransactionObject<any>;

  takeLoanOrderOnChainAsLender(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<any> | TransactionObject<any>;
  cancelLoanOrder(params: {
    order: Partial<IOrder>;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
  cancelLoanOrderWithHash(params: {
    loanOrderHash: string;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;

  getInitialCollateralRequired(
    loanTokenAddress: string,
    collateralTokenAddress: string,
    oracleAddress: string,
    loanTokenAmountFilled: BigNumber,
    initialMarginAmount: BigNumber
  ): Promise<BigNumber>;

  getSingleOrder(params: { loanOrderHash: string }): Promise<string>;
  getOrdersFillable(params: { start: BigNumber; count: BigNumber }): IOrder[];
  getOrdersForUser(params: {
    loanPartyAddress: string;
    start: BigNumber;
    count: BigNumber;
  }): IOrder[];

  // TODO: Maybe rename trader -> traderAddress
  getSingleLoan(params: {
    loanOrderHash: BigNumber;
    trader: BigNumber;
  }): Promise<string>;
  // TODO: Maybe rename address -> loanPartyAddress
  getLoansForLender(params: {
    address: string;
    count: BigNumber;
    activeOnly: boolean;
  }): Promise<string>;
  // TODO: Maybe rename address -> loanPartyAddress
  getLoansForTrader(params: {
    address: string;
    count: BigNumber;
    activeOnly: boolean;
  }): Promise<string>;

  transferToken(params: {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

  tradePositionWith0x(params: {
    order0x: any;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
  tradePositionWithOracle(params?: {
    orderHash: string;
    tradeTokenAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;

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
  }): Promise<boolean> | TransactionObject<boolean>;
  withdrawExcessCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    withdrawAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
  // TODO: Maybe rename trader -> traderAddress
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

  closeLoan(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
  // TODO: Maybe rename trader -> traderAddress
  payInterest(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;

  requestFaucetToken(params: {
    tokenAddress: string;
    receiverAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;

  // TODO: Return data type (?)
  getActiveLoans(params: { start: BigNumber; count: BigNumber }): IActiveLoan[];
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

  wrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
  unwrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;

  static generatePseudoRandomSalt(): BigNumber;
  static noop(): void;
  static toChecksumAddress(address: string): string;
  static getLoanOrderHashHex(order): string;
  static isValidSignature({ account, orderHash, signature }): boolean;
}

export default BZxJS;
