require('babel-register');
require('babel-polyfill');

var HDWalletProvider = require("truffle-hdwallet-provider");

var config = require('../config/secrets.js');

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
      //gas: 4712388,
      gasPrice: 20000000000
    },
    ropsten: {
      provider: new HDWalletProvider(config["mnemonic"]["ropsten"], "https://ropsten.infura.io/"+config["infura_apikey"]),
      network_id: 3,
      //gas: 4712388,
      gasPrice: 20000000000
    },
    /*mainnet: {
      provider: new HDWalletProvider(config["mnemonic"]["mainnet"], "https://mainnet.infura.io/"+config["infura_apikey"]),
      network_id: 1,
      gas: 4712388,
      gasPrice: 20000000000
    }*/
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
