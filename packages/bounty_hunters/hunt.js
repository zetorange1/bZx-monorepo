#!/usr/bin/env node

// importing classes
const Web3 = require("web3");
const { BZxJS } = require("bzx.js");
const BigNumber = require("bignumber.js");
const moment = require("moment");
const minimist = require("minimist");
const HDWalletProvider = require("truffle-hdwallet-provider");

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
      provider = new HDWalletProvider(secrets.mnemonic[network], `https://${network}.infura.io/`);
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
    console.log(`${idx} :: Current Block: ${await web3.eth.getBlockNumber()}`);
    console.log(`${idx} :: loanOrderHash: ${loanOrderHash}`);
    console.log(`${idx} :: trader: ${trader}`);
    console.log(`${idx} :: expirationUnixTimestampSec: ${expirationUnixTimestampSec}`);
    const marginData = await bzx.getMarginLevels({
      loanOrderHash,
      trader
    });
    // console.log(marginData);
    const { initialMarginAmount, maintenanceMarginAmount, currentMarginAmount } = marginData;
    console.log(`${idx} :: initialMarginAmount: ${initialMarginAmount}`);
    console.log(`${idx} :: maintenanceMarginAmount: ${maintenanceMarginAmount}`);
    console.log(`${idx} :: currentMarginAmount: ${currentMarginAmount}`);

    const isUnSafe = !BigNumber(currentMarginAmount)
      .dividedBy(1e18)
      .plus(2) // start reporting "unsafe" when 2% above maintenance threshold
      .gt(maintenanceMarginAmount);

    const expireDate = moment(expirationUnixTimestampSec * 1000).utc();
    const isExpired = moment(moment().utc()).isAfter(expireDate);

    if (isExpired || isUnSafe) {
      console.log(`${idx} :: Load is UNSAFE! Attempting to liquidate...`);

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
            // console.log(gas);
            txOpts.gas = gas;
            txObj
              .send(txOpts)
              .once("transactionHash", hash => {
                console.log(`\n${idx} :: Transaction submitted. Tx hash: ${hash}`);
              })
              .then(() => {
                console.log(`\n${idx} :: Liquidation complete!`);
              })
              .catch(error => {
                console.log(`\n${idx} :: Liquidation error -> ${error.message}`);
              });
          })
          .catch(error => {
            console.log(
              `\n${idx} :: The transaction is failing. This loan cannot be liquidated at this time -> ${error.message}`
            );
          });
      } catch (error) {
        console.log(`\n${idx} :: Liquidation error! -> ${error.message}`);
      }
    } else {
      console.log(`${idx} :: Load is safe.\n`);
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
    // console.log(loansObjArray);

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
        console.log(error);
        process.exit();
      }

      // console.log(result);
    })
    .on("data", async transaction => {
      // console.log(transaction);
      await processBlockOrders(web3, bzx, sender);
      console.log("Waiting for next block...");
    })
    .on("error", error => {
      console.log(error);
    });

  return subscription;
}

async function startQueryingForBlocks(web3, bzx, sender) {
  while (true) {
    await processBlockOrders(web3, bzx, sender);
    console.log(`Waiting ${checkIntervalSecs} seconds until next check...`);

    await snooze(checkIntervalSecs * 1000);
  }
}

async function main(web3, web3WS, bzx) {
  try {
    const accounts = await web3.eth.getAccounts();
    if (!accounts) {
      process.exit();
    }
    const sender = accounts[0];
    // sender = web3.eth.accounts.privateKeyToAccount(secrets["private_key"][network]).address;

    // const nonce = await web3.eth.getTransactionCount(sender);
    // console.log("nonce: "+nonce);

    if (trackBlocks && !web3WS) {
      console.log("Alert: The web3 provider used doesn't support websockets. Will check using checkIntervalSecs.");
      trackBlocks = false;
    }

    console.log("Waiting for blocks...");

    if (trackBlocks) {
      blocksSubscription = startListeningForBlocks(web3, web3WS, bzx, sender);
    } else {
      await startQueryingForBlocks(web3, bzx, sender);
    }
  } catch (error) {
    console.log(error);
  }
}

process.on("unhandledRejection", console.error.bind(console));
process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");

  if (blocksSubscription) {
    blocksSubscription.unsubscribe((error, success) => {
      if (success) console.log("Successfully unsubscribed!");

      process.exit();
    });
  } else {
    process.exit();
  }
});

(async () => {
  try {
    const network = getNetworkFromCommandLineParams();

    console.log(`Connecting to network ${network}...`);
    const { web3, web3WS } = initWeb3(network);
    const bzx = await initBZX(web3);

    await main(web3, web3WS, bzx);

    console.log("Execution finished, bye!...");
  } catch (error) {
    console.log(error);
  }
})();
