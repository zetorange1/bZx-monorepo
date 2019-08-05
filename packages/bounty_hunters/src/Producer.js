const BigNumber = require("bignumber.js");
const moment = require("moment");
const { Logger } = require("./LoggerFactory");
const consts = require("./../consts");

const getIsLiquidationInProgress = (redis, loanOrderHash) => redis.get(`bzx:liquidate:${loanOrderHash}`);

const publishLiquidationRequest = (redis, redlock, liquidateQueue, request) => {
  Logger.log("info", `check processing ${request.blockNumber}:${request.loanOrderHash}`);

  redlock.lock("bzx:processing:lock", 250).then(lock => {
    getIsLiquidationInProgress(redis, request.loanOrderHash).then(e => {
      if (e) {
        Logger.log("info", `submit skip ${request.blockNumber}:${request.loanOrderHash}`);
        lock.unlock();
      } else {
        Logger.log("info", `submit ${request.blockNumber}:${request.loanOrderHash}`);
        liquidateQueue.add(request).then(() => lock.unlock());
      }
    });
  });
};

const processBatchOrders = async (bzx, redis, redlock, queue, blockNumber, sender, loansObjArray, position) => {
  /* eslint no-plusplus: ["error", { "allowForLoopAfterthoughts": true }] */
  Logger.log("info", `Sender account: ${sender}`);
  for (let i = 0; i < loansObjArray.length; i++) {
    try {
      const { loanOrderHash, trader, loanEndUnixTimestampSec } = loansObjArray[i];

      const isLiquidationInProgress = await getIsLiquidationInProgress(redis, loanOrderHash);
      if (isLiquidationInProgress) {
        continue;
      }

      const idx = position + i;
      Logger.log("info", `${idx} :: loanOrderHash: ${loanOrderHash}`);
      Logger.log("info", `${idx} :: trader: ${trader}`);
      Logger.log("info", `${idx} :: loanEndUnixTimestampSec: ${loanEndUnixTimestampSec}`);
      const marginData = await bzx.getMarginLevels({
        loanOrderHash,
        trader
      });
      // logger.log("info",  marginData);
      const { initialMarginAmount, maintenanceMarginAmount, currentMarginAmount } = marginData;
      Logger.log("info", `${idx} :: initialMarginAmount: ${initialMarginAmount}`);
      Logger.log("info", `${idx} :: maintenanceMarginAmount: ${maintenanceMarginAmount}`);
      Logger.log("info", `${idx} :: currentMarginAmount: ${currentMarginAmount}`);

      const isUnSafe = !BigNumber(currentMarginAmount).gt(maintenanceMarginAmount);

      const expireDate = moment(loanEndUnixTimestampSec * 1000).utc();
      const isExpired = moment(moment().utc()).isAfter(expireDate);

      if (isExpired || isUnSafe) {
        await publishLiquidationRequest(redis, redlock, queue, { blockNumber, loanOrderHash, sender, trader });
      } else {
        Logger.log("info", `${idx} :: Loan is safe.\n`);
      }
    } catch (error) {
      Logger.log("error", "processBatchOrders catch");
      Logger.log("error", error);
    }
  }

  return loansObjArray.length;
};

const processBlockLoans = async (bzx, redis, redlock, queue, sender) => {
  let position = 0;
  while (true) {
    try {
      const blockNumber = await bzx.web3.eth.getBlockNumber();
      Logger.log("info", `Current Block: ${blockNumber}`);

      const loansObjArray = await bzx.getActiveLoans({
        start: position, // starting item
        count: consts.batchSize // max number of items returned
      });
      // logger.log("info", loansObjArray);

      const loanCount = await processBatchOrders(bzx, redis, redlock, queue, blockNumber, sender, loansObjArray, position);
      if (loanCount < consts.batchSize) {
        break;
      } else {
        position += consts.batchSize;
      }
    } catch (error) {
      Logger.log("error", "processBlockOrders catch");
      Logger.log("error", error);
    }
  }
};

module.exports = {
  processBlockLoans
};
