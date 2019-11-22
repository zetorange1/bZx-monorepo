const { Logger } = require("./LoggerFactory");
const consts = require("./../consts");
const { snooze } = require("./Utils");

// global subscription on
let blocksSubscription;

function startListeningForBlocks(web3, web3WS, sender, callback) {
  return web3WS.eth
    .subscribe("newBlockHeaders", (error, result) => {
      if (error) {
        Logger.log("error", "Subscription start:");
        Logger.log("error", error);
        process.exit();
      }

      // logger.log("info", result);
    })
    .on("data", async transaction => {
      // logger.log("info", transaction);
      Logger.log("info", "Just got block...");
      await callback(sender);
      Logger.log("info", "Waiting for next block...");
    })
    .on("error", error => {
      Logger.log("error", "Subscription error:");
      Logger.log("error", error);
      // we can try to reconnect here, but it looks like provider already trying to do so
    })
    .on("end", error => {
      Logger.log("error", "Subscription end:");
      Logger.log("error", error);

      // eslint-disable-next-line no-use-before-define
      unsubscribeAndExit();
      // we can try to reconnect here, but it looks like provider already trying to do so
    });
}

async function startQueryingForBlocks(web3, sender, callback) {
  while (true) {
    try {
      await callback(sender);
    } catch (error) {
      Logger.log("error", "startQueryingForBlocks catch");
      Logger.log("error", error);
    }
    Logger.log("info", `Waiting ${consts.checkIntervalSecs} seconds until next check...`);

    await snooze(consts.checkIntervalSecs * 1000);
  }
}

async function startPingWS(web3WS) {
  while (true) {
    try {
      await web3WS.eth.getHashrate();
    } catch (error) {
      Logger.log("error", "startQueryingForBlocks catch");
      Logger.log("error", error);
    }
    Logger.log("info", "Pinging server to avoid ws disconnection due to inactivity");

    await snooze(consts.pingIntervalSecs * 1000);
  }
}

async function subscribeForBlocks(web3, web3WS, sender, callback) {
  if (consts.trackBlocks && !web3WS) {
    Logger.log("warn", "Alert: The web3 provider used doesn't support websockets. Will check using checkIntervalSecs.");
    consts.trackBlocks = false;
  }

  Logger.log("info", "Waiting for blocks...");

  if (consts.trackBlocks) {
    blocksSubscription = startListeningForBlocks(web3, web3WS, sender, callback);
    await startPingWS(web3WS);
  } else {
    await startQueryingForBlocks(web3, sender, callback);
  }
}

function unsubscribeAndExit() {
  if (blocksSubscription) {
    blocksSubscription.unsubscribe((error, success) => {
      if (success) Logger.log("info", "Successfully unsubscribed!");

      process.exit();
    });
  } else {
    process.exit();
  }
}

module.exports = {
  subscribeForBlocks,
  unsubscribeAndExit
};
