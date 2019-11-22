#!/usr/bin/env node

// importing classes
const { Logger } = require("./src/LoggerFactory");
const Web3Factory = require("./src/Web3Factory");
const { getBZX } = require("./src/BzxFactory");
const { getNetworkNameFromCommandLineParams } = require("./src/Utils");
const { subscribeForBlocks, unsubscribeAndExit } = require("./src/TxListener");
const { processBlockLoans } = require("./src/Producer");
const Queue = require("bull");
const consts = require("./consts");
const { getRedisConnectivity } = require("./src/RedisFactory");
const { processLiquidationQueue } = require("./src/Consumer");

process.on("unhandledRejection", error => {
  Logger.log("error", "unhandledRejection catch");
  Logger.log("error", error);
});

process.on("SIGINT", async () => {
  Logger.log("info", "Caught interrupt signal");

  unsubscribeAndExit();
});

const getLiquidationProducer = async (web3) => {
  const { redis, redlock } = getRedisConnectivity();
  const bzx = await getBZX(web3);
  const liquidateQueue = new Queue("liquidate", consts.connectionString);

  return async (sender) => processBlockLoans(bzx, redis, redlock, liquidateQueue, sender);
};

const startLiquidationProcessors = async (web3, count) => {
  const { redis, redlock } = getRedisConnectivity();
  const bzx = await getBZX(web3);

  // eslint-disable-next-line no-plusplus
  for (let num = 1; num <= count; num++) {
    const liquidateQueue = new Queue("liquidate", consts.connectionString);
    liquidateQueue.process(async (job, done) => processLiquidationQueue(bzx, redis, redlock, num, job, done));
  }
};

(async () => {
  try {
    const network = getNetworkNameFromCommandLineParams();

    Logger.log("info", `Connecting to network ${network}...`);
    const { web3, web3WS } = Web3Factory.getWeb3(network);
    const accounts = await web3.eth.getAccounts();
    if (!accounts) {
      process.exit();
    }
    const sender = accounts[0];
    // sender = web3.eth.accounts.privateKeyToAccount(secrets["private_key"][network]).address;

    // const nonce = await web3.eth.getTransactionCount(sender);
    // logger.log("info", "nonce: "+nonce);

    await startLiquidationProcessors(web3, consts.processorsCount);
    await subscribeForBlocks(web3, web3WS, sender, await getLiquidationProducer(web3));


    Logger.log("info", "Execution finished, bye!...");
  } catch (error) {
    Logger.log("error", "Global error:");
    Logger.log("error", error);
    unsubscribeAndExit();
  }
})();
