const minimist = require("minimist");

const snooze = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const idleCycle = async () => {
  while (true) {
    await snooze(1000);
  }
};

const getNetworkNameFromCommandLineParams = () => {
  // processing command-line arguments (network)
  let { network } = minimist(process.argv.slice(2));

  // eslint-disable-next-line eqeqeq
  if (network === undefined || network == true) {
    network = "development";
  }

  return network;
};

module.exports = {
  snooze,
  idleCycle,
  getNetworkNameFromCommandLineParams
};
