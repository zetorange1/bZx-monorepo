const { Interface, providers, Contract } = require("ethers");

let network, txhash;

var fs = require("fs");
if (process.argv.length >= 4) {
  network = process.argv[2];
  txhash = process.argv[3];
} else {
  process.exit();
}

let provider;
if (!network) {
  network = "development";
  provider = new providers.JsonRpcProvider("http://localhost:8545/");
} else {
  //provider = new providers.InfuraProvider(network);
  provider = new providers.JsonRpcProvider("http://localhost:8545/");
}

provider.send("debug_traceTransaction", [txhash, {}]).then(function(trace) {
  console.log(JSON.stringify(trace, null, "\t"));
});
