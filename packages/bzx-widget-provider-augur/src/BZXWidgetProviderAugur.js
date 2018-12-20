import Augur from "augur.js";
import BigNumber from "bignumber.js";
import { BZxJS } from "@bzxnetwork/bzx.js";
import EventEmitter from "events";
import moment from "moment";
import Web3 from "web3";

import { parseUrlGetParams, zeroAddress } from "./utils";
import { EVENT_ASSET_UPDATE, EVENT_INIT_FAILED } from "@bzxnetwork/bzx-widget-common";

BigNumber.config({ EXPONENTIAL_AT: 20 });

export default class BZXWidgetProviderAugur {
  networkId = 4;
  defaultGasAmount = 1000000;
  defaultGasPrice = new BigNumber(12).times(10 ** 9).toString();
  batchSize = 50;

  // https://hackmd.io/xAwX4xmIQk-K2w6Ecs8U_w?view#AugurOracle-Implementation-AugurOraclesol
  wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab";
  bzxAddress = "0x01de670be497b88b10d9b59e748a701992a0c532";
  bzxVaultAddress = "0x81558e6edf0f7ae1222fd56ad63cffad09dadf64";
  bZxOracleAddress = "";
  bzxAugurOracleAddress = "";

  // assets available for selection in the input on top
  assets = [];
  // asset to select by default in the input on top
  defaultAsset = "";

  eventEmitter = new EventEmitter();

  constructor() {
    this._subscribeToUrlChanges();

    // reading web3 instance from window
    let { web3 } = window;
    const alreadyInjected = typeof web3 !== `undefined`;
    if (alreadyInjected) {
      this.web3 = new Web3(web3.currentProvider);
      this.web3.currentProvider.enable().then(
        result => {
          this.account = result[0];

          // init bzxjs
          this.bzxjs = new BZxJS(this.web3, { networkId: this.networkId });
          this.bzxjs.getOracleList().then(
            oracles => {
              console.dir(oracles);

              const bZxOracle = oracles.filter(oracle => oracle.name === "bZxOracle")[0];
              const augurOracle = oracles.filter(oracle => oracle.name === "AugurOracle")[0];
              if (augurOracle && bZxOracle) {
                this.bZxOracleAddress = bZxOracle.address;
                this.bzxAugurOracleAddress = augurOracle.address;

                // creating augur instance
                this.augur = new Augur();
                // connecting to augur instance
                this.augur.connect(
                  // at the current time _getAugurConnectivity returns only rinkeby data
                  this._getAugurConnectivity(),
                  (err, connectionInfo) => {
                    this._refreshAssets();
                  }
                );
              } else {
                if (!bZxOracle) {
                  this.eventEmitter.emit(EVENT_INIT_FAILED, "no `bZxOracle` oracle available");
                }

                if (!augurOracle) {
                  this.eventEmitter.emit(EVENT_INIT_FAILED, "no `AugurOracle` oracle available");
                }
              }
            },
            () => this.eventEmitter.emit(EVENT_INIT_FAILED, "unable to get list of oracles available")
          );
        },
        () => this.eventEmitter.emit(EVENT_INIT_FAILED, "unable to enable web3 provider")
      );
    } else {
      // widget is not listening eventEmitter at this place, so let's write to console at least
      console.log("web3 provider is not available");
    }
  }

  getLendFormDefaults = () => {
    return {
      qty: "1",
      interestRate: 30,
      duration: 10,
      ratio: 2,
      relays: [],
      pushOnChain: true
    };
  };

  getLendFormOptions = () => {
    return {
      relays: ["Shark", "Veil"],
      ratios: [1, 2, 4],
      interestRateMin: 1,
      interestRateMax: 100,
      durationMin: 1,
      durationMax: 28
    };
  };

  getBorrowFormDefaults = () => {
    return {
      qty: "1",
      interestRate: 30,
      duration: 10,
      ratio: 2,
      relays: [],
      pushOnChain: true
    };
  };

  getBorrowFormOptions = () => {
    return {
      relays: ["Shark", "Veil"],
      ratios: [1, 2, 4],
      interestRateMin: 1,
      interestRateMax: 100,
      durationMin: 1,
      durationMax: 28
    };
  };

  getQuickPositionFormDefaults = () => {
    return {
      qty: "1",
      positionType: "long",
      ratio: 2,
      pushOnChain: true
    };
  };

  getQuickPositionFormOptions = () => {
    return {
      ratios: [1, 2, 4]
    };
  };

  doLendOrderApprove = async (value) => {
    return new Promise((resolve, reject) => {
      try {
        this._handleLendOrderApprove(value, resolve, reject);
      }
      catch (e) {
        console.dir(e);
        reject("error happened while processing your request");
      }
    });
  };

  doBorrowOrderApprove = async (value) => {
    return new Promise((resolve, reject) => {
      try {
        this._handleBorrowOrderApprove(value, resolve, reject);
      }
      catch (e) {
        console.dir(e);
        reject("error happened while processing your request");
      }
    });
  };

  doQuickPositionApprove = async (value) => {
    return new Promise((resolve, reject) => {
      try {
        this._handleQuickPositionApprove(value, resolve, reject);
      }
      catch (e) {
        console.dir(e);
        reject("error happened while processing your request");
      }
    });
  };

  _getAugurConnectivity = () => {
    //TODO: use this.networkId

    const ethereumNode = {
      httpAddresses: [
        "https://rinkeby.augur.net/ethereum-http", // hosted http address for Geth node on the Rinkeby test network
        "https://rinkeby.infura.io/"
      ],
      wsAddresses: [
        "wss://rinkeby.augur.net/ethereum-ws", // hosted WebSocket address for Geth node on the Rinkeby test network
        "wss://rinkeby.infura.io/ws/"
      ]
    };

    const augurNode = "wss://dev.augur.net/augur-node";

    return { ethereumNode, augurNode };
  };

  _getAugurMarkedId = () => {
    let params = parseUrlGetParams();
    return params.id;
  };

  _getAugurMarketShareOutcomeNumber = async (currentMarketId, shareTokenAddress) => {
    const getMarketsPromise = new Promise((resolve, reject) => {
      this.augur.markets.getMarketsInfo({ marketIds: [currentMarketId] }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    const result = await getMarketsPromise;

    const outcomesMap = result[0].outcomes.map(async e => {
      const shareTokenAddress = await this.augur.api.Market.getShareToken({
        _outcome: this.augur.utils.convertBigNumberToHexString(new BigNumber(e.id)),
        tx: { to: currentMarketId }
      });
      const shareTokenText = `${e.description} / volume: ${e.volume} / address: ${shareTokenAddress}`;

      return { num: e.id, id: shareTokenAddress, text: shareTokenText };
    });

    const outcomes = await Promise.all(outcomesMap);
    const filteredOutcomes = outcomes.filter(e => e.id.toLowerCase() === shareTokenAddress.toLowerCase()).map(e => e.num);

    return (filteredOutcomes.length > 0)
      ? filteredOutcomes[0]
      : null;
  };

  _subscribeToUrlChanges = () => {
    let that = this;

    window.addEventListener("hashchange", that._refreshAssets, false);
    window.addEventListener("onpopstate", that._refreshAssets, false);
  };

  _refreshAssets = async () => {
    // getting marketId from url "id" param
    const currentMarketId = this._getAugurMarkedId();
    if (currentMarketId) {
      // reading info about current market assets
      this.augur.markets.getMarketsInfo({ marketIds: [currentMarketId] }, (error, result) => {
        // good place to check if market is scalar (if we'll ever need it)

        // here we are using rinkeby WETH asset address, but showing to user as ETH
        const wethTokenContractAddress = this.wethAddress.toLowerCase();

        // getting shares tokens list
        const outcomesMap = result[0].outcomes.map(async e => {
          const shareTokenAddress = await this.augur.api.Market.getShareToken({
            _outcome: this.augur.utils.convertBigNumberToHexString(new BigNumber(e.id)),
            tx: { to: currentMarketId }
          });
          const shareTokenText = `${e.description} / volume: ${e.volume} / address: ${shareTokenAddress}`;

          return { id: shareTokenAddress, text: shareTokenText };
        });

        outcomesMap.unshift({ id: wethTokenContractAddress, text: "ETH" });

        // resolving asyncs with Promise.all
        Promise.all(outcomesMap).then(result => {
          this.assets = result;
          this.defaultAsset = wethTokenContractAddress;

          this._handleAssetsUpdate();
        });
      });
    } else {
      // if we are not on the market page we must clean available assets
      this.assets = [];
      this.defaultAsset = "";

      // let's ask widget to update assets list
      this._handleAssetsUpdate();
    }
  };

  _handleAssetsUpdate = () => {
    this.eventEmitter.emit(EVENT_ASSET_UPDATE, this.assets, this.defaultAsset);
  };

  _preValidateLendOrderApprove = value => {
    if (!value.asset) {
      return { isValid: false, message: "asset is not selected" };
    }

    if (!value.pushOnChain) {
      return { isValid: false, message: "pushing to relay is not yet supported" };
    }

    return { isValid: true, message: "" };
  };

  _handleLendOrderApprove = async (value, resolve, reject) => {
    // The user creates bzx order to lend current market tokens he already owns.

    try {

      let validationResult = this._preValidateLendOrderApprove(value);
      if (!validationResult.isValid) {
        reject(validationResult.message);
        return;
      }

      const lenderAddress = this.account.toLowerCase();
      console.log(`lenderAddress: ${lenderAddress}`);

      let transactionReceipt;

      // FOR SHARES THIS QTY SHOULD BE W/O DENOMINATION, BUT FOR WETH IT SHOULD BE IN WEI
      const loanAmountInBaseUnits =
        value.asset === this.wethAddress
          ? this.web3.utils.toWei(value.qty, "ether")
          : value.qty;
      // CALCULATING MARGIN AMOUNT FROM "RATIO" (100 / RATIO)
      const initialMarginAmount = new BigNumber(100).dividedBy(value.ratio);
      const maintenanceMarginAmount = initialMarginAmount.dividedBy(2);
      const orderOracleAddress = this.bzxAugurOracleAddress.toLowerCase();
      // const orderOracleAddress = this.bZxOracleAddress.toLowerCase();
      const orderOracleData = this._getAugurMarkedId();
      // const orderOracleData = "0x";
      const conversionRate =
        value.asset === this.wethAddress
          ? new BigNumber(1)
          : new BigNumber(
            (await this.bzxjs.getConversionData(
              value.asset.toLowerCase(),
              this.wethAddress.toLowerCase(),
              loanAmountInBaseUnits,
              orderOracleAddress
            )).rate
          );
      console.log(`conversionRate: ${conversionRate}`);
      if (conversionRate.eq(0)) {
        throw "Not enough liquidity";
      }

      // CALCULATING INTEREST AS % FROM LOAN
      const interestAmount =
        new BigNumber(loanAmountInBaseUnits)
          .multipliedBy(conversionRate)
          .multipliedBy(new BigNumber(value.interestRate))
          .dividedBy(value.duration)
          .dividedBy(100);
      console.log(`interestAmount: ${interestAmount}`);

      console.log("setting allowance for share's token");
      transactionReceipt = await this.bzxjs.setAllowanceUnlimited({
        tokenAddress: value.asset.toLowerCase(),
        ownerAddress: lenderAddress,
        spenderAddress: this.bzxVaultAddress.toLowerCase(),
        getObject: false,
        txOpts: { from: lenderAddress, gasPrice: this.defaultGasPrice }
      });
      console.dir(transactionReceipt);

      console.log("creating lend order");
      const lendOrder = {
        bZxAddress: this.bzxAddress.toLowerCase(),
        makerAddress: lenderAddress.toLowerCase(),
        loanTokenAddress: value.asset.toLowerCase(),
        interestTokenAddress: this.wethAddress.toLowerCase(),
        collateralTokenAddress: this.wethAddress.toLowerCase(),
        feeRecipientAddress: zeroAddress.toLowerCase(),
        oracleAddress: orderOracleAddress.toLowerCase(),
        loanTokenAmount: loanAmountInBaseUnits.toString(),
        interestAmount: interestAmount.toString(),
        initialMarginAmount: initialMarginAmount.toString(),
        maintenanceMarginAmount: maintenanceMarginAmount.toString(),
        // USING CONSTANTS BELOW
        lenderRelayFee: "0",
        traderRelayFee: "0",
        // EXPECTING DURATION IN DAYS
        maxDurationUnixTimestampSec: (value.duration * 86400).toString(),
        expirationUnixTimestampSec: moment().add(7, "day").unix().toString(), // 7 days
        makerRole: "0", // 0=LENDER, 1=TRADER
        salt: BZxJS.generatePseudoRandomSalt()
      };
      console.dir(lendOrder);

      console.log("signing lend order");
      const lendOrderHash = BZxJS.getLoanOrderHashHex({
        ...lendOrder,
        oracleData: orderOracleData.toLowerCase()
      });
      console.log(`lendOrderHash: ${lendOrderHash}`);

      const lendOrderSignature = await this.bzxjs.signOrderHashAsync(lendOrderHash, lenderAddress, true);
      console.log(`lendOrderSignature: ${lendOrderSignature}`);

      const signedLendOrder = { ...lendOrder, signature: lendOrderSignature };

      if (value.pushOnChain) {
        console.log("pushing order on-chain");
        transactionReceipt = await this.bzxjs.pushLoanOrderOnChain({
          order: signedLendOrder,
          oracleData: orderOracleData.toLowerCase(),
          getObject: false,
          txOpts: { from: lenderAddress, gasPrice: this.defaultGasPrice, gas: this.defaultGasAmount }
        });
        console.dir(transactionReceipt);

        resolve(transactionReceipt.transactionHash);
        return;
      } else {
        reject("pushing to relay is not yet supported");
        return;
      }

    }
    catch (e) {
      console.dir(e);
      reject("error happened while processing your request");
      return;
    }
  };

  _preValidateBorrowOrderApprove = value => {
    if (!value.asset) {
      return { isValid: false, message: "asset is not selected" };
    }

    if (!value.pushOnChain) {
      return { isValid: false, message: "pushing to relay is not yet supported" };
    }

    return { isValid: true, message: "" };
  };

  _handleBorrowOrderApprove = async (value, resolve, reject) => {
    // The user creates bzx order to borrow eth for future trade on the current market.

    try {

      let validationResult = this._preValidateBorrowOrderApprove(value);
      if (!validationResult.isValid) {
        reject(validationResult.message);
        return;
      }

      const borrowerAddress = this.account.toLowerCase();
      console.log(`borrowerAddress: ${borrowerAddress}`);

      let transactionReceipt;

      // FOR SHARES THIS QTY SHOULD BE W/O DENOMINATION, BUT FOR WETH IT SHOULD BE IN WEI
      const borrowAmountInBaseUnits =
        value.asset === this.wethAddress
          ? this.web3.utils.toWei(value.qty, "ether")
          : value.qty;
      // CALCULATING MARGIN AMOUNT FROM "RATIO" (100 / RATIO)
      const initialMarginAmount = new BigNumber(100).dividedBy(value.ratio);
      const maintenanceMarginAmount = initialMarginAmount.dividedBy(2);
      const orderOracleAddress = this.bzxAugurOracleAddress.toLowerCase();
      // const orderOracleAddress = this.bZxOracleAddress.toLowerCase();
      const orderOracleData = this._getAugurMarkedId();
      // const orderOracleData = "0x";
      const conversionRate =
        value.asset === this.wethAddress
          ? new BigNumber(1)
          : new BigNumber(
            (await this.bzxjs.getConversionData(
              value.asset.toLowerCase(),
              this.wethAddress.toLowerCase(),
              borrowAmountInBaseUnits,
              orderOracleAddress
            )).rate
          );
      console.log(`conversionRate: ${conversionRate}`);
      if (conversionRate.eq(0)) {
        throw "Not enough liquidity";
      }

      // CALCULATING INTEREST AS % FROM LOAN
      const interestAmount =
        new BigNumber(borrowAmountInBaseUnits)
          .multipliedBy(conversionRate)
          .multipliedBy(new BigNumber(value.interestRate))
          .dividedBy(value.duration)
          .dividedBy(100);
      console.log(`interestAmount: ${interestAmount}`);

      console.log("setting allowance for collateral token (weth)");
      transactionReceipt = await this.bzxjs.setAllowanceUnlimited({
        tokenAddress: this.wethAddress.toLowerCase(),
        ownerAddress: borrowerAddress,
        spenderAddress: this.bzxVaultAddress.toLowerCase(),
        getObject: false,
        txOpts: { from: borrowerAddress, gasPrice: this.defaultGasPrice }
      });
      console.dir(transactionReceipt);

      console.log("creating borrow order");
      const borrowOrder = {
        bZxAddress: this.bzxAddress.toLowerCase(),
        makerAddress: borrowerAddress.toLowerCase(),
        loanTokenAddress: value.asset.toLowerCase(),
        interestTokenAddress: this.wethAddress.toLowerCase(),
        collateralTokenAddress: this.wethAddress.toLowerCase(),
        feeRecipientAddress: zeroAddress.toLowerCase(),
        oracleAddress: orderOracleAddress.toLowerCase(),
        loanTokenAmount: borrowAmountInBaseUnits.toString(),
        interestAmount: interestAmount.toString(),
        initialMarginAmount: initialMarginAmount.toString(),
        // USING CONSTANTS BELOW
        maintenanceMarginAmount: maintenanceMarginAmount.toString(),
        lenderRelayFee: "0",
        traderRelayFee: "0",
        // EXPECTING DURATION IN DAYS
        maxDurationUnixTimestampSec: (value.duration * 86400).toString(),
        expirationUnixTimestampSec: moment().add(7, "day").unix().toString(), // 7 days
        makerRole: "1", // 0=LENDER, 1=TRADER
        salt: BZxJS.generatePseudoRandomSalt()
      };
      console.dir(borrowOrder);

      console.log("signing borrow order");
      const borrowOrderHash = BZxJS.getLoanOrderHashHex({
        ...borrowOrder,
        oracleData: orderOracleData.toLowerCase()
      });
      console.log(`borrowOrderHash: ${borrowOrderHash}`);

      const borrowOrderSignature = await this.bzxjs.signOrderHashAsync(borrowOrderHash, borrowerAddress, true);
      console.log(`borrowOrderSignature: ${borrowOrderSignature}`);

      const signedBorrowOrder = { ...borrowOrder, signature: borrowOrderSignature };

      if (value.pushOnChain) {
        console.log("pushing order on-chain");
        transactionReceipt = await this.bzxjs.pushLoanOrderOnChain({
          order: signedBorrowOrder,
          oracleData: orderOracleData.toLowerCase(),
          getObject: false,
          txOpts: { from: borrowerAddress, gasPrice: this.defaultGasPrice, gas: this.defaultGasAmount }
        });
        console.dir(transactionReceipt);

        resolve(transactionReceipt.transactionHash);
        return;
      } else {
        reject("pushing to relay is not yet supported");
        return;
      }
    }
    catch (e) {
      console.dir(e);
      reject("error happened while processing your request");
      return;
    }
  };

  _preValidateQuickPositionApprove = value => {
    if (!value.asset) {
      return { isValid: false, message: "asset is not selected" };
    }

    if (value.asset.toLowerCase() === this.wethAddress) {
      return { isValid: false, message: "unable open quick position with ETH" };
    }

    if (!value.pushOnChain) {
      return { isValid: false, message: "pushing to relay is not yet supported" };
    }

    return { isValid: true, message: "" };
  };

  _handleQuickPositionApprove = async (value, resolve, reject) => {
    try {
      let validationResult = this._preValidateQuickPositionApprove(value);
      if (!validationResult.isValid) {
        reject(validationResult.message);
        return;
      }

      if (value.positionType === "long") {
        await this._handleLeverageLong(value, resolve, reject);
      } else if (value.positionType === "short") {
        await this._handleLeverageShort(value, resolve, reject);
      } else {
        reject("something went wrong");
        return;
      }
    }
    catch (e) {
      console.dir(e);
      reject("error happened while processing your request");
      return;
    }
  };

  _handleLeverageLong = async (value, resolve, reject) => {
    // Leverage long:
    // - find order lowest ask (seller's price) at augur
    // - calculate required ETH amount (using augur orders)
    // - find in bzx ETH lend orders with approved current market
    // - take ETH lend order
    // - buy tokens at augur market using bzx

    const marketId = this._getAugurMarkedId();

    const sellOrders = await this._findAugurLowestAskSellOrders(marketId, value.asset.toLowerCase(), value.qty);

    const ethAmountToBorrow = await this._getEthAmountToBorrow(sellOrders, value.qty);
    const weiAmountToBorrow =
      this.web3.utils.toWei(
        ethAmountToBorrow.toString(),
        "ether"
      ).toString();
    console.log(`weiAmountToBorrow: ${weiAmountToBorrow}`);

    const ethLendOrders = await this._findLendOrdersForCurrentMarket(marketId, this.wethAddress, weiAmountToBorrow);
    console.log(`ethLendOrders: ${ethLendOrders}`);

    await this._takeLendOrders(ethLendOrders, weiAmountToBorrow);
    await this._takeAugurOrdersWithBzx(sellOrders, value.asset, value.qty);

    resolve();
  };

  _handleLeverageShort = async (value, resolve, reject) => {
    // Leverage short:
    // - find order highest bid (buyer's price) at augur
    // - calculate required 'market token' amount (using augur orders)
    // - find in bzx 'market token' lend orders with current market
    // - take 'market token' lend order
    // - sell tokens at augur market using bzx

    const marketId = this._getAugurMarkedId();

    const buyOrders = await this._findAugurHighestBidBuyOrders(marketId, value.asset.toLowerCase(), value.qty);
    const sharesAmountToBorrow = value.qty;
    console.log(`sharesAmountToBorrow: ${sharesAmountToBorrow}`);
    const sharesLendOrders = await this._findLendOrdersForCurrentMarket(marketId, value.asset.toLowerCase(), sharesAmountToBorrow);

    await this._takeLendOrders(sharesLendOrders, sharesAmountToBorrow);
    await this._takeAugurOrdersWithBzx(buyOrders, value.asset, value.qty);

    resolve();
  };

  _findAugurHighestBidBuyOrders = async(marketId, marketShareTokenAddress, amount) => {
    const outcomeNumber = await this._getAugurMarketShareOutcomeNumber(marketId, marketShareTokenAddress);
    const augurOrdersPromise =
      new Promise((resolve, reject) => {
        this.augur.trading.getOrders({
          marketId: marketId,
          outcome: outcomeNumber,
          orderType: "buy",
          orderState: "OPEN",
          orphaned: false,
          sortBy: "price",
          isSortDescending: true
        }, (error, result) => {
          console.dir(error);
          console.dir(result);
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        })
    });

    const singleSideOrderBook = await augurOrdersPromise;
    const orders = singleSideOrderBook[marketId.toString().toLowerCase()];

    let amountToTake = new BigNumber(amount);
    const ordersArray = [];
    for (let num in orders) {
      const orderKeyValueObject = orders[num]["sell"];
      for (let id in orderKeyValueObject) {
        let amountShouldBeTaken = BigNumber.minimum(new BigNumber(orderKeyValueObject[id].amount), amountToTake);
        if (amountShouldBeTaken.eq(0)) {
          break;
        }

        amountToTake = amountToTake.minus(amountShouldBeTaken);
        ordersArray.push(orderKeyValueObject[id]);
      }
    }

    console.dir(ordersArray);

    return ordersArray;
  };

  _findAugurLowestAskSellOrders = async(marketId, marketShareTokenAddress, amount) => {
    const outcomeNumber = await this._getAugurMarketShareOutcomeNumber(marketId, marketShareTokenAddress);
    const augurOrdersPromise =
      new Promise((resolve, reject) => {
        this.augur.trading.getOrders({
          marketId: marketId,
          outcome: outcomeNumber,
          orderType: "sell",
          orderState: "OPEN",
          orphaned: false,
          sortBy: "price",
          isSortDescending: false
        }, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        })
      });

    const singleSideOrderBook = await augurOrdersPromise;
    const orders = singleSideOrderBook[marketId.toString().toLowerCase()];

    let amountToTake = new BigNumber(amount);
    const ordersArray = [];
    for (let num in orders) {
      const orderKeyValueObject = orders[num]["sell"];
      for (let id in orderKeyValueObject) {
        let amountShouldBeTaken = BigNumber.minimum(new BigNumber(orderKeyValueObject[id].amount), amountToTake);
        if (amountShouldBeTaken.eq(0)) {
          break;
        }

        amountToTake = amountToTake.minus(amountShouldBeTaken);
        ordersArray.push(orderKeyValueObject[id]);
      }
    }

    console.dir(ordersArray);

    return ordersArray;
  };

  _getEthAmountToBorrow = async (sellOrders, amount) => {
    let amountToTake = new BigNumber(amount);
    let amountToBorrow = new BigNumber(0);
    for (let e of sellOrders) {
      let amountShouldBeTaken = BigNumber.minimum(new BigNumber(e.amount), amountToTake);
      if (amountShouldBeTaken.eq(0)) {
        break;
      }

      amountToTake = amountToTake.minus(amountShouldBeTaken);
      amountToBorrow = amountToBorrow.plus(amountShouldBeTaken.multipliedBy(new BigNumber(e.price)));
    }

    return amountToBorrow;
  };

  _findLendOrdersForCurrentMarket = async (market, tokenAddress, amount) => {
    let fullLendOrdersList = [];
    const pageSize = 100;
    let readCount = 0;

    let pageContent;
    do {
      pageContent = await this.bzxjs.getOrdersFillable({ start: readCount, count: pageSize });
      fullLendOrdersList.push(
        ...pageContent
        .filter(e =>
          e.oracleAddress.toLowerCase() === this.bzxAugurOracleAddress.toLowerCase()
          // enabled market filter
          // check expiration date. order should be valid for next `default duration days` - for. ex. 3
          && e.loanTokenAddress.toLowerCase() === tokenAddress.toLowerCase()
          // && e.lender.toLowerCase() !== this.account.toLowerCase()
        )
      );

      readCount += pageContent.length;
    } while(pageContent.length >= pageSize);
    fullLendOrdersList = fullLendOrdersList.sort(
      (a, b) => {
        const criteriaAmount = ((a.interestAmount/a.loanTokenAmount) - (b.interestAmount/b.loanTokenAmount));
        if (criteriaAmount !== 0)
          return criteriaAmount;

        return b.loanTokenAmount - a.loanTokenAmount;
      }
    );
    console.dir(fullLendOrdersList);


    return fullLendOrdersList;
  };

  _takeLendOrders = async (orders, amount) => {
    let amountToTake = new BigNumber(amount);
    for (let e of orders) {
      let amountShouldBeTaken = BigNumber.minimum(new BigNumber(e.loanTokenAmount), amountToTake);
      if (amountShouldBeTaken.eq(0)) {
        break;
      }

      console.log(`Taking order ${e.loanOrderHash}, ${amountShouldBeTaken}`);
      let transactionReceipt = await this.bzxjs.takeLoanOrderAsTrader({
        order: e,
        collateralTokenAddress: this.wethAddress.address,
        loanTokenAmountFilled: amountShouldBeTaken,
        getObject: false,
        txOpts: { from: this.account, gasLimit: utils.gasLimit }
      });
      console.log(transactionReceipt);

      amountToTake = amountToTake.minus(amountShouldBeTaken);
    }
  };

  _takeAugurOrdersWithBzx = async (orders, tokenAddress, amount) => {
    let amountToTake = new BigNumber(amount);
    for (let e of orders) {
      let amountShouldBeTaken = BigNumber.minimum(new BigNumber(e.amount), amountToTake);
      if (amountShouldBeTaken.eq(0)) {
        break;
      }

      console.log(`Taking augur order with bzx ${e.orderId}, ${amountShouldBeTaken}`);
      await this.bzxjs.tradePositionWithOracle({
        orderHash: e.orderId.toLowerCase(),
        tradeTokenAddress: tokenAddress.toLowerCase(),
        getObject: false,
        txOpts: { from: this.account, gasPrice: this.defaultGasPrice, gas: this.defaultGasAmount }
      });

      amountToTake = amountToTake.minus(amountShouldBeTaken);
    }
  };
}
