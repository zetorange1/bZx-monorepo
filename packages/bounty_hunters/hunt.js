#!/usr/bin/env node

let argv = require("minimist")(process.argv.slice(2));
let network = argv["network"];

if (network === undefined || network == true) {
  network = "development";
}

console.log("Connecting to network " + network + "...");

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
const fs = require("fs");
const Web3 = require("web3");
const { BZxJS } = require("bzx.js");
const BigNumber = require("bignumber.js");
const moment = require("moment");

const secrets = require("../config/secrets.js");
/*
Example secrets file (with blank values):

module.exports = {
	"infura_apikey": "",
	"mnemonic": {
		"testnet": "",
		"b0xnet": "",
		"ropsten": "",
		"kovan": "",
		"rinkeby": "",
		"mainnet": "",
    },
    private_key: {
		"testnet": "",
		"b0xnet": "",
		"ropsten": "",
		"kovan": "",
		"rinkeby": "",
		"mainnet": "",
    },
*/

// the number of seconds to wait between rechecking each loan
// if trackBlocks = true, this is ignored
const checkIntervalSecs = 10;

// the wallet type to use
// mnemonic or private_key must be defined in the secrets.js file the given network
const walletType = "mnemonic"; // or private_key or ledger

// the gas price to use for liquidation transactions
const defaultGasPrice = BigNumber(2).times(10 ** 9);

// if true, recheck loans on each now block
// if false, check on an interval set by checkIntervalSecs
let trackBlocks = true;

let provider, providerWS, sender;
if (network !== "development") {
  if (walletType === "mnemonic") {
    const HDWalletProvider = require("truffle-hdwallet-provider");
    provider = new HDWalletProvider(
      secrets["mnemonic"][network],
      "https://" + network + ".infura.io/"
    );
    providerWS = new Web3.providers.WebsocketProvider(
      "wss://" + network + ".infura.io/ws"
    );
  } else if (walletType === "ledger") {
    //TODO: ledger code
    process.exit();
  } else {
    // private_key
    //TODO: private key code
    process.exit();

    //provider = new Web3.providers.HttpProvider("https://"+network+".infura.io");
    //providerWS = new Web3.providers.WebsocketProvider("wss://"+network+".infura.io/ws");
    //sender = web3.eth.accounts.privateKeyToAccount(secrets["private_key"][network]).address;
  }
} else {
  provider = new Web3.providers.HttpProvider("http://localhost:8545");
}

const web3 = new Web3(provider);

let web3WS;
if (providerWS) web3WS = new Web3(providerWS);

let b0x;

process.on("unhandledRejection", console.error.bind(console));

async function processOrders(loansObjArray, position) {
  if (!b0x) {
    throw new Error(`b0x.js not initialized!`);
    await process.exit();
  }
  if (!sender) {
    throw new Error(`wallet not found!`);
    await process.exit();
  }

  for (let i = 0; i < loansObjArray.length; i++) {
    const { loanOrderHash, trader, expirationUnixTimestampSec } = loansObjArray[
      i
    ];

    let idx = position + i;
    console.log(
      idx + " :: " + "Current Block: " + (await web3.eth.getBlockNumber())
    );
    console.log(idx + " :: " + "loanOrderHash: " + loanOrderHash);
    console.log(idx + " :: " + "trader: " + trader);
    console.log(
      idx + " :: " + "expirationUnixTimestampSec: " + expirationUnixTimestampSec
    );
    const marginData = await b0x.getMarginLevels({
      loanOrderHash,
      trader
    });
    //console.log(marginData);
    const {
      initialMarginAmount,
      maintenanceMarginAmount,
      currentMarginAmount
    } = marginData;
    console.log(idx + " :: " + "initialMarginAmount: " + initialMarginAmount);
    console.log(
      idx + " :: " + "maintenanceMarginAmount: " + maintenanceMarginAmount
    );
    console.log(idx + " :: " + "currentMarginAmount: " + currentMarginAmount);

    const isUnSafe = !BigNumber(currentMarginAmount)
      .dividedBy(1e18)
      .plus(2) // start reporting "unsafe" when 2% above maintenance threshold
      .gt(maintenanceMarginAmount);

    const expireDate = moment(expirationUnixTimestampSec * 1000).utc();
    const isExpired = moment(moment().utc()).isAfter(expireDate);

    if (isExpired || isUnSafe) {
      console.log(idx + " :: " + "Load is UNSAFE! Attempting to liquidate...");

      const txOpts = {
        from: sender,
        // gas: 1000000, // gas estimated in b0x.js
        gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
      };

      const txObj = await b0x.liquidateLoan({
        loanOrderHash,
        trader,
        getObject: true
      });

      try {
        await txObj
          .estimateGas(txOpts)
          .then(gas => {
            //console.log(gas);
            txOpts.gas = gas;
            txObj
              .send(txOpts)
              .once("transactionHash", hash => {
                console.log(
                  "\n" +
                    idx +
                    " :: " +
                    "Transaction submitted. Tx hash: " +
                    hash
                );
              })
              .then(() => {
                console.log("\n" + idx + " :: " + "Liquidation complete!");
              })
              .catch(error => {
                console.log(
                  "\n" + idx + " :: " + "Liquidation error -> " + error.message
                );
              });
          })
          .catch(error => {
            console.log(
              "\n" +
                idx +
                " :: " +
                "The transaction is failing. This loan cannot be liquidated at this time -> " +
                error.message
            );
          });
      } catch (error) {
        console.log(
          "\n" + idx + " :: " + "Liquidation error! -> " + error.message
        );
      }
    } else {
      console.log(idx + " :: " + "Load is safe.\n");
    }
  }

  return loansObjArray.length;
}

async function main() {
  try {
    const accounts = await web3.eth.getAccounts();
    if (!accounts) {
      process.exit();
    }
    sender = accounts[0];

    //const nonce = await web3.eth.getTransactionCount(sender);
    //console.log("nonce: "+nonce);
    console.log("Waiting for next block...");

    const networkId = await web3.eth.net.getId();

    b0x = new BZxJS(web3.currentProvider, { networkId });

    const batchSize = 10;

    if (trackBlocks && !web3WS) {
      console.log(
        "Alert: The web3 provider used doesn't support websockets. Will check using checkIntervalSecs."
      );
      trackBlocks = false;
    }

    let filterBlocks;
    if (trackBlocks) {
      filterBlocks = web3WS.eth
        .subscribe("newBlockHeaders", function(error, result) {
          if (error) {
            console.log(error);
            process.exit();
          }

          //console.log(result);
        })
        .on("data", async function(transaction) {
          //console.log(transaction);

          let position = 0;
          while (true) {
            const loansObjArray = await b0x.getActiveLoans({
              start: position, // starting item
              count: batchSize // max number of items returned
            });
            //console.log(loansObjArray);

            const loanCount = await processOrders(loansObjArray, position);
            if (loanCount < batchSize) {
              console.log("Waiting for next block...");
              break;
            } else {
              position += batchSize;
            }
          }
        })
        .on("error", function(error) {
          console.log(error);
        });
    } else {
      // no WS connection, so we need to check this way

      while (true) {
        var position = 0;
        while (true) {
          const loansObjArray = await b0x.getActiveLoans({
            start: position, // starting item
            count: batchSize // max number of items returned
          });
          //console.log(loansObjArray);

          const loanCount = await processOrders(loansObjArray, position);
          if (loanCount < batchSize) {
            break;
          } else {
            position += batchSize;
          }
        }

        console.log(
          "Waiting " + checkIntervalSecs + " seconds until next check..."
        );
        await snooze(checkIntervalSecs * 1000);
      }
    }

    process.on("SIGINT", async function() {
      console.log("Caught interrupt signal");

      if (filterBlocks) {
        filterBlocks.unsubscribe(function(error, success) {
          if (success) console.log("Successfully unsubscribed!");

          process.exit();
        });
      } else {
        process.exit();
      }
    });
  } catch (error) {
    console.log(error);
  }
}

main();
