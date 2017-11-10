require('babel-register');
require('babel-polyfill');

module.exports = {
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 4712388, // Default is 4712388
      gasPrice: 0 // Default is 100000000000 (100 Shannon)
    }
  }
};
