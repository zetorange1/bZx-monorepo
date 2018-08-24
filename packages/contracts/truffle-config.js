require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");

var secrets = "",
  ropstenMnemonic = "",
  kovanMnemonic = "",
  rinkebyMnemonic = "",
  mainnetMnemonic = "",
  infuraApikey = "";
try {
  secrets = require('../config/secrets.js');
  ropstenMnemonic = secrets["mnemonic"]["ropsten"],
  kovanMnemonic = secrets["mnemonic"]["kovan"],
  rinkebyMnemonic = secrets["mnemonic"]["rinkeby"],
  mainnetMnemonic = secrets["mnemonic"]["mainnet"],
  infuraApikey = secrets["infura_apikey"];
} catch (e) {}

module.exports = {
  migrations_directory: "./migrations",
  rpc: {
    host: "localhost",
    port: 8545
  },
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "50",
      gas: 4700000,
      gasPrice: 20000000000
    },
    testnet: {
      host: "localhost",
      port: 8545,
      network_id: "50",
      gas: 4700000,
      gasPrice: 20000000000
    },
    coverage: {
      host: "localhost",
      port: 8555,
      network_id: "55",
      gas: 500000000,
      gasPrice: 20000000000
    },
    ropsten: {
      provider: new HDWalletProvider(ropstenMnemonic, "https://ropsten.infura.io/"+infuraApikey),
      network_id: 3,
      gas: 4700000,
      gasPrice: 50000000000
    },
    kovan: {
      provider: new HDWalletProvider(kovanMnemonic, "https://kovan.infura.io/"+infuraApikey),
      network_id: 42,
      gas: 4700000,
      gasPrice: 20000000000
    },
    rinkeby: {
      provider: new HDWalletProvider(rinkebyMnemonic, "https://rinkeby.infura.io/"+infuraApikey),
      network_id: 4,
      gas: 4700000,
      gasPrice: 20000000000
    },
    mainnet: {
      provider: new HDWalletProvider(mainnetMnemonic, "https://mainnet.infura.io/"+infuraApikey),
      network_id: 1,
      gas: 4700000,
      gasPrice: 10000000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
