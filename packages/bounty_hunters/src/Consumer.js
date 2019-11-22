const { Logger } = require("./LoggerFactory");
const consts = require("./../consts");

const liquidateLoan = async (bzx, sender, loanOrderHash, trader, blockNumber) => {
  Logger.log("info", `\n${loanOrderHash} :: Liquidity check block number: ${blockNumber}`);
  try {
    const currentBlockNumber = await bzx.web3.eth.getBlockNumber();
    Logger.log("info", `\n${loanOrderHash} :: Current block number: ${currentBlockNumber}`);
    if (blockNumber < currentBlockNumber) {
      Logger.log("info", `${loanOrderHash} :: Liquidation request is OLD!!! SKIPPING`);
      return;
    }
  } catch (error) {
    Logger.log("error", `\n${loanOrderHash} :: Block number validation error! -> ${error.message}`);
  }

  Logger.log("info", `${loanOrderHash} :: Loan is UNSAFE! Attempting to liquidate...`);
  const txOpts = {
    from: sender,
    // gas: 1000000, // gas estimated in bzx.js
    // gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    gasPrice: consts.defaultGasPrice
  };

  const txObj = await bzx.liquidateLoan({
    loanOrderHash,
    trader,
    getObject: true
  });

  try {
    const gasEstimate = await txObj.estimateGas(txOpts);

    // logger.log(gasEstimate);
    txOpts.gas = Math.round(gasEstimate + gasEstimate * 0.1);
    const request = txObj.send(txOpts);
    request.once("transactionHash", hash => {
      Logger.log("info", `\n${loanOrderHash} :: Transaction submitted. Tx hash: ${hash}`);
    });

    await request();
    Logger.log("info", `\n${loanOrderHash} :: Liquidation complete!`);
  } catch (error) {
    Logger.log("error", `\n${loanOrderHash} :: Liquidation error! -> ${error.message}`);
  }
};

const processLiquidationQueue = async (bzx, redis, redlock, processorNumber, job, done) => {
  Logger.log(
    "info",
    `processing(${processorNumber}) prepare ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );

  await redlock.lock("bzx:processing:lock", 100).then(lock => {
    redis.set(`bzx:liquidate:${job.data.loanOrderHash}`, 1, "EX", 20000);
    lock.unlock();
  });

  Logger.log(
    "info",
    `processing(${processorNumber}) start ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );

  await liquidateLoan(bzx, job.data.sender, job.data.loanOrderHash, job.data.trader, job.data.blockNumber).then(() => {
    Logger.log(
      "info",
      `processing(${processorNumber}) done ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
    );

    redlock.lock("bzx:processing:lock", 100).then(lock => {
      redis.del(`bzx:liquidate:${job.data.loanOrderHash}`).then(() => {
        done();
      });

      lock.unlock();
    });

    Logger.log(
      "info",
      `processing(${processorNumber}) finished ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
    );
  });
};

module.exports = {
  processLiquidationQueue
};
