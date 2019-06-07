require("babel-register");
require("babel-polyfill");

//var HDWalletProvider = require("truffle-hdwallet-provider");
var PrivateKeyProvider = require("truffle-privatekey-provider");

var secrets = "",
  ropstenPrivKey = "",
  kovanPrivKey = "",
  rinkebyPrivKey = "",
  mainnetPrivKey = "",
  infuraApikey = "",
  alchemyApikey = "";
try {
  secrets = require("../../config/secrets.js");
    (ropstenPrivKey = secrets["private_key"]["ropsten"]),
    (kovanPrivKey = secrets["private_key"]["kovan"]),
    (rinkebyPrivKey = secrets["private_key"]["rinkeby"]),
    (mainnetPrivKey = secrets["private_key"]["mainnet"]),
    (infuraApikey = secrets["infura_apikey"]),
    (alchemyApikey = secrets["alchemy_apikey"]);
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
      gas: 6721975,
      gasPrice: 20000000000
    },
    testnet: {
      host: "localhost",
      port: 8545,
      network_id: "50",
      gas: 6721975,
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
      provider: () => new PrivateKeyProvider(
        ropstenPrivKey,
        "https://eth-ropsten.alchemyapi.io/jsonrpc/" + alchemyApikey
        //"https://ropsten.infura.io/v3/" + infuraApikey
      ),
      /*provider: () => new HDWalletProvider(
        ropstenMnemonic,
        "https://ropsten.infura.io/v3/" + infuraApikey
      ),*/
      network_id: 3,
      gas: 8000000,
      gasPrice: 10000000000,
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    kovan: {
      provider: () => new PrivateKeyProvider(
        kovanPrivKey,
        "https://eth-kovan.alchemyapi.io/jsonrpc/" + alchemyApikey
        //"https://kovan.infura.io/v3/" + infuraApikey
      ),
      /*provider: () => new HDWalletProvider(
        kovanMnemonic,
        "https://kovan.infura.io/v3/" + infuraApikey
      ),*/
      network_id: 42,
      gas: 8000000,
      gasPrice: 10000000000,
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    rinkeby: {
      provider: () => new PrivateKeyProvider(
        rinkebyPrivKey,
        "https://eth-rinkeby.alchemyapi.io/jsonrpc/" + alchemyApikey
        //"https://rinkeby.infura.io/v3/" + infuraApikey
      ),
      /*provider: () => new HDWalletProvider(
        rinkebyMnemonic,
        "https://rinkeby.infura.io/v3/" + infuraApikey
      ),*/
      network_id: 4,
      gas: 6721975,
      gasPrice: 10000000000,
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    mainnet: {
      provider: () => new PrivateKeyProvider(
        mainnetPrivKey,
        "https://eth-mainnet.alchemyapi.io/jsonrpc/" + alchemyApikey
        //"https://mainnet.infura.io/v3/" + infuraApikey
      ),
      /*provider: () => new HDWalletProvider(
        mainnetMnemonic,
        "https://mainnet.infura.io/v3/" + infuraApikey
      ),*/
      network_id: 1,
      gas: 6721975,
      gasPrice: 12000000000,
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "../../node_modules/solc_0.5.3", // v0.5.3
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  },
};
