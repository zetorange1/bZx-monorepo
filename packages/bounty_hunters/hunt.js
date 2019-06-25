#!/usr/bin/env node

// importing classes
const Web3 = require("web3");
const { BZxJS } = require("@bzxnetwork/bzx.js");
const BigNumber = require("bignumber.js");
const moment = require("moment");
const minimist = require("minimist");
const winston = require("winston");
const os = require("os");

// importing secrets
const secrets = require("../../../config/secrets.js");

// the wallet type to use
// mnemonic or private_key must be defined in the secrets.js file the given network
const walletType = "private_key"; // or private_key or ledger

// the gas price to use for liquidation transactions
const defaultGasPrice = BigNumber(12).times(10 ** 9);

// if true, recheck loans on each now block
// if false, check on an interval set by checkIntervalSecs
let trackBlocks = false;

// the number of seconds to wait between rechecking each loan
// if trackBlocks = true, this is ignored
const checkIntervalSecs = 120; // 2 minutes

// the number of seconds to wait between rechecking hashrate
const pingIntervalSecs = 30;

// max number of active loans returned in a batch
const batchSize = 10;

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${(info.stack) ? os.EOL + info.stack : ""}`)
  ),
  transports: [
    new winston.transports.Console({ level: "debug" })
    // new winston.transports.File({ filename: "combined.log" })
  ]
});

// global subscription on
let blocksSubscription;

let txnsInProgress = {};

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
      const HDWalletProvider = require("truffle-hdwallet-provider");
      const infuraAuth = secrets.infura_apikey ? `${secrets.infura_apikey}/` : "";
      provider = new HDWalletProvider(secrets.mnemonic[network], `https://${network}.infura.io/v3/${infuraAuth}`);
      // https://github.com/ethereum/web3.js/issues/1559
      // but web3@1.0.0-beta.36 is not yet available
      providerWS = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws/v3/${infuraAuth}`);
    } else if (walletType === "ledger") {
      // TODO: ledger code
      process.exit();
    } else if (walletType === "private_key") {
      if (!secrets.private_key[network]) {
        logger.log("error", "Private Key missing from secrets.js file!");
        process.exit();
      }
      const PrivateKeyProvider = require("truffle-privatekey-provider");
      const infuraAuth = secrets.infura_apikey ? `${secrets.infura_apikey}/` : "";
      const privateKey = secrets.private_key[network];
      provider = new PrivateKeyProvider(privateKey, `https://${network}.infura.io/v3/${infuraAuth}`);
      providerWS = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws/v3/${infuraAuth}`);
    } else {
      process.exit();
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
  return new BZxJS(web3, { networkId });
}

async function processBatchOrders(web3, bzx, sender, loansObjArray, position) {
  /* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
  logger.log("info", "Sender account: "+sender);
  for (let i = 0; i < loansObjArray.length; i++) {
    try {
      const {loanOrderHash, trader, loanEndUnixTimestampSec} = loansObjArray[i];

	  if (txnsInProgress[loanOrderHash+trader]) {
		  continue;
	  }

      const idx = position + i;
      logger.log("info", `${idx} :: loanOrderHash: ${loanOrderHash}`);
      logger.log("info", `${idx} :: trader: ${trader}`);
      logger.log("info", `${idx} :: loanEndUnixTimestampSec: ${loanEndUnixTimestampSec}`);
      const marginData = await bzx.getMarginLevels({
        loanOrderHash,
        trader
      });
      // logger.log("info",  marginData);
      const {initialMarginAmount, maintenanceMarginAmount, currentMarginAmount} = marginData;
      logger.log("info", `${idx} :: initialMarginAmount: ${initialMarginAmount}`);
      logger.log("info", `${idx} :: maintenanceMarginAmount: ${maintenanceMarginAmount}`);
      logger.log("info", `${idx} :: currentMarginAmount: ${currentMarginAmount}`);

      const isUnSafe = !BigNumber(currentMarginAmount)
        .gt(maintenanceMarginAmount);

      const expireDate = moment(loanEndUnixTimestampSec * 1000).utc();
      const isExpired = moment(moment().utc()).isAfter(expireDate);

      if (isExpired || isUnSafe) {
        logger.log("info", `${idx} :: Loan is UNSAFE! Attempting to liquidate...`);

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
            .then(gasEstimate => {
              // logger.log(gasEstimate);
              txOpts.gas = Math.round(gasEstimate + gasEstimate * 0.1);
              txObj
                .send(txOpts)
                .once("transactionHash", hash => {
                  logger.log("info", `\n${idx} :: Transaction submitted. Tx hash: ${hash}`);
				  txnsInProgress[loanOrderHash+trader] = true;
                })
                .then(() => {
                  logger.log("info", `\n${idx} :: Liquidation complete!`);
				  delete txnsInProgress[loanOrderHash+trader];
                })
                .catch(error => {
                  logger.log("error", `\n${idx} :: Liquidation error -> ${error.message}`);
				  delete txnsInProgress[loanOrderHash+trader];
                });
            })
            .catch(error => {
              logger.log(
                "error",
                `\n${idx} :: The transaction is failing. This loan cannot be liquidated at this time -> ${error.message}`
              );
			  delete txnsInProgress[loanOrderHash+trader];
            });
        } catch (error) {
          logger.log("error", `\n${idx} :: Liquidation error! -> ${error.message}`);
		  delete txnsInProgress[loanOrderHash+trader];
        }
      } else {
        logger.log("info", `${idx} :: Loan is safe.\n`);
      }
    }
    catch(error) {
      logger.log("error", "processBatchOrders catch");
      logger.log("error", error);
    }
  }

  return loansObjArray.length;
}

async function processBlockOrders(web3, bzx, sender) {
  let position = 0;
  while (true) {
    try {
      logger.log("info", `Current Block: ${await web3.eth.getBlockNumber()}`);
      
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
    catch(error) {
      logger.log("error", "processBlockOrders catch");
      logger.log("error", error);
    }
  }
}

function startListeningForBlocks(web3, web3WS, bzx, sender) {
  const subscription = web3WS.eth
    .subscribe("newBlockHeaders", (error, result) => {
      if (error) {
        logger.log("error", "Subscription start:");
        logger.log("error", error);
        process.exit();
      }

      // logger.log("info", result);
    })
    .on("data", async transaction => {
      // logger.log("info", transaction);
      logger.log("info", "Just got block...");
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

      unsubscribeAndExit();
      // we can try to reconnect here, but it looks like provider already trying to do so
    });

  return subscription;
}

async function startQueryingForBlocks(web3, bzx, sender) {
  while (true) {
    try {
      await processBlockOrders(web3, bzx, sender);
    }
    catch (error) {
      logger.log("error", "startQueryingForBlocks catch");
      logger.log("error", error);
    }
    logger.log("info", `Waiting ${checkIntervalSecs} seconds until next check...`);

    await snooze(checkIntervalSecs * 1000);
  }
}

async function startPingWS(web3WS) {
  while (true) {
    try {
      await web3WS.eth.getHashrate();
    }
    catch (error) {
      logger.log("error", "startQueryingForBlocks catch");
      logger.log("error", error);
    }
    logger.log("info", "Pinging server to avoid ws disconnection due to inactivity");

    await snooze(pingIntervalSecs * 1000);
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
    await startPingWS(web3WS);
  } else {
    await startQueryingForBlocks(web3, bzx, sender);
  }
}

function unsubscribeAndExit() {
  if (blocksSubscription) {
    blocksSubscription.unsubscribe((error, success) => {
      if (success) logger.log("info", "Successfully unsubscribed!");

      process.exit();
    });
  } else {
    process.exit();
  }
}

process.on("unhandledRejection", error => {
  logger.log("error", "unhandledRejection catch");
  logger.log("error", error);
});

process.on("SIGINT", async () => {
  logger.log("info", "Caught interrupt signal");

  unsubscribeAndExit();
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
    unsubscribeAndExit();
  }
})();
