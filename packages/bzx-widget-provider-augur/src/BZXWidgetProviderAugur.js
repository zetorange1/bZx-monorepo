import Augur from "augur.js";
import BigNumber from "bignumber.js";
import { BZxJS } from "bzx.js";
import EventEmitter from "events";
import moment from "moment";
import Web3 from "web3";

import { parseUrlGetParams, zeroAddress } from "./utils";
import { EVENT_ASSET_UPDATE } from "../../bzx-widget-common/src";

export default class BZXWidgetProviderAugur {
  // network related consts
  networkId = 4;
  wethAddress = "0xc778417e063141139fce010982780140aa0cd5ab";
  bzxAddress = "0x8ec550d3f5908a007c36f220455fee5be4f841a1";
  bzxVaultAddress = "0x4B367e65fb4C4e7a82988ab90761A9BB510369D7";
  bzxAugurOracleAddress = "0x3F72ee0DC010138927bEDffBf65ec5Abe5B106F1";
  defaultGasPrice = new BigNumber(12).times(10 ** 9);
  batchSize = 50;

  // assets available for selection in the input on top
  assets = [];
  // asset to select by default in the input on top
  defaultAsset = "";

  eventEmitter = new EventEmitter();

  constructor() {
    this._subscribeToUrlChanges();

    // creating augur instance
    this.augur = new Augur();

    // reading web3 instance from window
    let { web3 } = window;
    const alreadyInjected = typeof web3 !== `undefined`;
    if (alreadyInjected) {
      this.web3 = new Web3(web3.currentProvider);
      this.web3.currentProvider.enable().then(result => {
        this.account = result[0];

        // init bzxjs
        this.bzxjs = new BZxJS(this.web3, { networkId: this.networkId });

        // connecting to augur instance
        this.augur.connect(
          // at the current time _getAugurConnectivity returns only rinkeby data
          this._getAugurConnectivity(),
          (err, connectionInfo) => {
            this._refreshAssets();
          }
        );
      });
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

  _handleAssetsUpdate() {
    this.eventEmitter.emit(EVENT_ASSET_UPDATE, this.assets, this.defaultAsset);
  }

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

      let transactionReceipt;

      const amountInBaseUnits = value.asset === this.wethAddress ? this.web3.utils.toWei(value.qty, "ether") : value.qty;

      console.log("setting allowance for share's token");
      transactionReceipt = await this.bzxjs.setAllowance({
        tokenAddress: value.asset.toLowerCase(),
        ownerAddress: lenderAddress,
        spenderAddress: this.bzxVaultAddress.toLowerCase(),
        amountInBaseUnits: amountInBaseUnits.toString(),
        getObject: false,
        txOpts: { from: lenderAddress, gasPrice: this.defaultGasPrice }
      });
      console.dir(transactionReceipt);

      console.log("creating lend order");
      const lendOrder = {
        bZxAddress: this.bzxAddress.toLowerCase(),
        makerAddress: lenderAddress.toLowerCase(),
        loanTokenAddress: value.asset.toLowerCase(),
        // IF WE ARE USING INTEREST IN % W/O SETTING CURRENCY LET'S USE LOAN CURRENCY
        interestTokenAddress: value.asset.toLowerCase(),
        collateralTokenAddress: zeroAddress.toLowerCase(),
        feeRecipientAddress: zeroAddress.toLowerCase(),
        oracleAddress: this.bzxAugurOracleAddress.toLowerCase(),
        // FOR SHARES THIS QTY SHOULD BE W/O DENOMINATION, BUT FOR WETH IT SHOULD BE IN WEI
        loanTokenAmount: amountInBaseUnits.toString(),
        // CALCULATING INTEREST AS % FROM LOAN
        interestAmount: new BigNumber(amountInBaseUnits).multipliedBy(new BigNumber(value.interestRate)).dividedBy(100),
        // CALCULATING MARGIN AMOUNT FROM "RATIO" (100 / RATIO)
        initialMarginAmount: new BigNumber(100).dividedBy(value.ratio).toFixed(0),
        // USING CONSTANTS BELOW
        maintenanceMarginAmount: "15",
        lenderRelayFee: this.web3.utils.toWei("0.001", "ether"),
        traderRelayFee: this.web3.utils.toWei("0.001", "ether"),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        // EXPECTING DURATION IN DAYS
        expirationUnixTimestampSec: moment()
          .add(value.duration, "day")
          .unix()
          .toString(),
        makerRole: "0", // 0=LENDER, 1=TRADER
        salt: BZxJS.generatePseudoRandomSalt().toString()
      };

      console.log("signing lend order");
      const lendOrderHash = BZxJS.getLoanOrderHashHex(lendOrder);
      const lendOrderSignature = await this.bzxjs.signOrderHashAsync(lendOrderHash, lenderAddress, true);
      const signedLendOrder = { ...lendOrder, signature: lendOrderSignature };

      if (value.pushOnChain) {
        console.log("pushing order on-chain");
        transactionReceipt = await this.bzxjs.pushLoanOrderOnChain({
          order: signedLendOrder,
          getObject: false,
          txOpts: { from: lenderAddress, gasPrice: this.defaultGasPrice }
        });
        console.dir(transactionReceipt);

        resolve(transactionReceipt);
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

      let transactionReceipt;

      const amountInBaseUnits = value.asset === this.wethAddress ? this.web3.utils.toWei(value.qty, "ether") : value.qty;

      console.log("setting allowance for share's token");
      transactionReceipt = await this.bzxjs.setAllowance({
        tokenAddress: value.asset.toLowerCase(),
        ownerAddress: borrowerAddress,
        spenderAddress: this.bzxVaultAddress.toLowerCase(),
        // CALCULATING ALLOWANCE ACCORDING "RATIO" + 1 BU
        amountInBaseUnits: (new BigNumber(amountInBaseUnits).dividedBy(value.ratio).toFixed(0) + 1).toString(),
        getObject: false,
        txOpts: { from: borrowerAddress, gasPrice: this.defaultGasPrice }
      });
      console.dir(transactionReceipt);

      console.log("creating lend order");
      const borrowOrder = {
        bZxAddress: this.bzxAddress.toLowerCase(),
        makerAddress: borrowerAddress.toLowerCase(),
        loanTokenAddress: value.asset.toLowerCase(),
        // IF WE ARE USING INTEREST IN % W/O SETTING CURRENCY LET'S USE LOAN CURRENCY
        interestTokenAddress: value.asset.toLowerCase(),
        // WE DON'T KNOW WHAT COLLATERAL WE CAN USE INSTEAD
        collateralTokenAddress: value.asset.toLowerCase(),
        feeRecipientAddress: zeroAddress.toLowerCase(),
        oracleAddress: this.bzxAugurOracleAddress.toLowerCase(),
        loanTokenAmount: amountInBaseUnits.toString(),
        // CALCULATING INTEREST AS % FROM LOAN
        interestAmount: new BigNumber().multipliedBy(new BigNumber(value.interestRate)).dividedBy(100),
        // CALCULATING MARGIN AMOUNT FROM "RATIO" (100 / RATIO)
        initialMarginAmount: new BigNumber(100).dividedBy(value.ratio).toFixed(0),
        // USING CONSTANTS BELOW
        maintenanceMarginAmount: "15",
        lenderRelayFee: this.web3.utils.toWei("0.001", "ether"),
        traderRelayFee: this.web3.utils.toWei("0.001", "ether"),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        // EXPECTING DURATION IN DAYS
        expirationUnixTimestampSec: moment()
          .add(value.duration, "day")
          .unix()
          .toString(),
        makerRole: "1", // 0=LENDER, 1=TRADER
        salt: BZxJS.generatePseudoRandomSalt().toString()
      };

      console.log("signing lend order");
      const borrowOrderHash = BZxJS.getLoanOrderHashHex(borrowOrder);
      const borrowOrderSignature = await this.bzxjs.signOrderHashAsync(borrowOrderHash, borrowerAddress, true);
      const signedLendOrder = { ...borrowOrder, signature: borrowOrderSignature };

      if (value.pushOnChain) {
        console.log("pushing order on-chain");
        transactionReceipt = await this.bzxjs.pushLoanOrderOnChain({
          order: signedLendOrder,
          getObject: false,
          txOpts: { from: borrowerAddress, gasPrice: this.defaultGasPrice }
        });
        console.dir(transactionReceipt);

        resolve(transactionReceipt);
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
    // - find in bzx ETH lend orders with approved current market
    // - take ETH lend order
    // - find order lowest ask (seller's price)
    // - buy tokens at augur market using bzx
    resolve();
  };

  _handleLeverageShort = async (value, resolve, reject) => {
    // Leverage short:
    // - find in bzx 'market token' lend orders with current market
    // - take 'market token' lend order
    // - find order highest bid (buyer's price)
    // - buy tokens at augur market using bzx
    resolve();
  };
}
