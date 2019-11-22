const BigNumber = require("bignumber.js");

const Consts = {
  processorsCount: 2,

  // redisConnection string
  connectionString: "redis://127.0.0.1:6379",

  // the wallet type to use
  // mnemonic or private_key must be defined in the secrets.js file the given network
  walletType: "private_key", // or private_key or ledger

  // the gas price to use for liquidation transactions
  defaultGasPrice: BigNumber(12).times(10 ** 9),

  // if true, recheck loans on each now block
  // if false, check on an interval set by checkIntervalSecs
  trackBlocks: false,

  // the number of seconds to wait between rechecking each loan
  // if trackBlocks = true, this is ignored
  checkIntervalSecs: 10,

  // the number of seconds to wait between rechecking hashrate
  pingIntervalSecs: 30,

  // max number of active loans returned in a batch
  batchSize: 10
};

module.exports = Consts;
