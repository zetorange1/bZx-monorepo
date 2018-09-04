#!/usr/bin/env node

// importing classes
const Web3 = require("web3");
const { BZxJS } = require("bzx.js");
const BigNumber = require("bignumber.js");
const moment = require("moment");
const minimist = require("minimist");
const HDWalletProvider = require("truffle-hdwallet-provider");
const winston = require("winston");

// importing secrets
const secrets = require("../../config/secrets.js");

// the wallet type to use
// mnemonic or private_key must be defined in the secrets.js file the given network
const walletType = "mnemonic"; // or private_key or ledger

// the gas price to use for liquidation transactions
const defaultGasPrice = BigNumber(5).times(10 ** 9);

// if true, recheck loans on each now block
// if false, check on an interval set by checkIntervalSecs
let trackBlocks = true;

// the number of seconds to wait between rechecking each loan
// if trackBlocks = true, this is ignored
const checkIntervalSecs = 10;

// max number of active loans returned
const batchSize = 10;

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({ level: 'debug' }),
    // new winston.transports.File({ filename: "combined.log" })
  ]
});

// global subscription on
let blocksSubscription;

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

function getNetworkFromCommandLineParams() {
  // processing command-line arguments (network)
  let { network } = minimist(process.argv.slice(2));

  if (network === undefined || network == true) {
    network = "development";
  }

  return network;
}

function initWeb3(network) {
  let provider, providerWS;
  if (network !== "development") {
    if (walletType === "mnemonic") {
      const infuraAuth = (secrets.infura_apikey) ? `${secrets.infura_apikey}/` : "";
      provider = new HDWalletProvider(secrets.mnemonic[network], `https://${network}.infura.io/${infuraAuth}`);
      providerWS = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws`);
    } else if (walletType === "ledger") {
      // TODO: ledger code
      process.exit();
    } else {
      // private_key
      // TODO: private key code
      process.exit();

      // provider = new Web3.providers.HttpProvider("https://"+network+".infura.io");
      // providerWS = new Web3.providers.WebsocketProvider("wss://"+network+".infura.io/ws");
    }
  } else {
    provider = new Web3.providers.HttpProvider("http://localhost:8545");
  }

  // init web3 and web3ws
  const web3 = new Web3(provider);

  let web3WS = null;
  if (providerWS) web3WS = new Web3(providerWS);

  return { web3, web3WS };
}

async function initBZX(web3) {
  const networkId = await web3.eth.net.getId();
  return new BZxJS(web3.currentProvider, { networkId });
}

async function processBatchOrders(web3, bzx, sender, loansObjArray, position) {
  /* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
  for (let i = 0; i < loansObjArray.length; i++) {
    const { loanOrderHash, trader, expirationUnixTimestampSec } = loansObjArray[i];

    const idx = position + i;
    logger.log("info", `${idx} :: Current Block: ${await web3.eth.getBlockNumber()}`);
    logger.log("info", `${idx} :: loanOrderHash: ${loanOrderHash}`);
    logger.log("info", `${idx} :: trader: ${trader}`);
    logger.log("info", `${idx} :: expirationUnixTimestampSec: ${expirationUnixTimestampSec}`);
    const marginData = await bzx.getMarginLevels({
      loanOrderHash,
      trader
    });
    // logger.log("info",  marginData);
    const { initialMarginAmount, maintenanceMarginAmount, currentMarginAmount } = marginData;
    logger.log("info", `${idx} :: initialMarginAmount: ${initialMarginAmount}`);
    logger.log("info", `${idx} :: maintenanceMarginAmount: ${maintenanceMarginAmount}`);
    logger.log("info", `${idx} :: currentMarginAmount: ${currentMarginAmount}`);

    const isUnSafe = !BigNumber(currentMarginAmount)
      .dividedBy(1e18)
      .plus(2) // start reporting "unsafe" when 2% above maintenance threshold
      .gt(maintenanceMarginAmount);

    const expireDate = moment(expirationUnixTimestampSec * 1000).utc();
    const isExpired = moment(moment().utc()).isAfter(expireDate);

    if (isExpired || isUnSafe) {
      logger.log("info", `${idx} :: Load is UNSAFE! Attempting to liquidate...`);

      const txOpts = {
        from: sender,
        // gas: 1000000, // gas estimated in bzx.js
        // gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
        gasPrice: defaultGasPrice
      };

      const txObj = await bzx.liquidateLoan({
        loanOrderHash,
        trader,
        getObject: true
      });

      try {
        await txObj
          .estimateGas(txOpts)
          .then(gas => {
            // logger.log(gas);
            txOpts.gas = gas;
            txObj
              .send(txOpts)
              .once("transactionHash", hash => {
                logger.log("info", `\n${idx} :: Transaction submitted. Tx hash: ${hash}`);
              })
              .then(() => {
                logger.log("info", `\n${idx} :: Liquidation complete!`);
              })
              .catch(error => {
                logger.log("error", `\n${idx} :: Liquidation error -> ${error.message}`);
              });
          })
          .catch(error => {
            logger.log(
              "error",
              `\n${idx} :: The transaction is failing. This loan cannot be liquidated at this time -> ${error.message}`
            );
          });
      } catch (error) {
        logger.log("error", `\n${idx} :: Liquidation error! -> ${error.message}`);
      }
    } else {
      logger.log("info", `${idx} :: Load is safe.\n`);
    }
  }

  return loansObjArray.length;
}

async function processBlockOrders(web3, bzx, sender) {
  let position = 0;
  while (true) {
    const loansObjArray = await bzx.getActiveLoans({
      start: position, // starting item
      count: batchSize // max number of items returned
    });
    // logger.log("info", loansObjArray);

    const loanCount = await processBatchOrders(web3, bzx, sender, loansObjArray, position);
    if (loanCount < batchSize) {
      break;
    } else {
      position += batchSize;
    }
  }
}

function startListeningForBlocks(web3, web3WS, bzx, sender) {
  const subscription = web3WS.eth
    .subscribe("newBlockHeaders", (error, result) => {
      if (error) {
        logger.log("error", error);
        process.exit();
      }

      // logger.log("info", result);
    })
    .on("data", async transaction => {
      // logger.log("info", transaction);
      await processBlockOrders(web3, bzx, sender);
      logger.log("info", "Waiting for next block...");
    })
    .on("error", error => {
      logger.log("error", "Subscription error:");
      logger.log("error", error);
      // we can try to reconnect here, but it looks like provider already trying to do so
    })
    .on("end", error => {
      logger.log("error", "Subscription end:");
      logger.log("error", error);
      // we can try to reconnect here, but it looks like provider already trying to do so
    });

  return subscription;
}

async function startQueryingForBlocks(web3, bzx, sender) {
  while (true) {
    await processBlockOrders(web3, bzx, sender);
    logger.log("info", `Waiting ${checkIntervalSecs} seconds until next check...`);

    await snooze(checkIntervalSecs * 1000);
  }
}

async function main(web3, web3WS, bzx) {
  const accounts = await web3.eth.getAccounts();
  if (!accounts) {
    process.exit();
  }
  const sender = accounts[0];
  // sender = web3.eth.accounts.privateKeyToAccount(secrets["private_key"][network]).address;

  // const nonce = await web3.eth.getTransactionCount(sender);
  // logger.log("info", "nonce: "+nonce);

  if (trackBlocks && !web3WS) {
    logger.log("warn", "Alert: The web3 provider used doesn't support websockets. Will check using checkIntervalSecs.");
    trackBlocks = false;
  }

  logger.log("info", "Waiting for blocks...");

  if (trackBlocks) {
    blocksSubscription = startListeningForBlocks(web3, web3WS, bzx, sender);
  } else {
    await startQueryingForBlocks(web3, bzx, sender);
  }
}

process.on("unhandledRejection", console.error.bind(console));
process.on("SIGINT", async () => {
  logger.log("info", "Caught interrupt signal");

  if (blocksSubscription) {
    blocksSubscription.unsubscribe((error, success) => {
      if (success) logger.log("info", "Successfully unsubscribed!");

      process.exit();
    });
  } else {
    process.exit();
  }
});

(async () => {
  try {
    const network = getNetworkFromCommandLineParams();

    logger.log("info", `Connecting to network ${network}...`);
    const { web3, web3WS } = initWeb3(network);
    const bzx = await initBZX(web3);

    await main(web3, web3WS, bzx);

    logger.log("info", "Execution finished, bye!...");
  } catch (error) {
    logger.log("error", "Global error:");
    logger.log("error", error);
  }
})();
