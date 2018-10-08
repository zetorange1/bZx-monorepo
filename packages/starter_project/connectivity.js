const Web3 = require("web3");
const { BZxJS } = require("bzx.js");
const utils = require("./utils");

async function initConnectivity() {
  // init web3 provider
  const provider = new Web3.providers.HttpProvider(utils.ganacheUri);
  const web3 = new Web3(provider);
  const networkId = await web3.eth.net.getId();

  // init bZx
  const bzxjs = new BZxJS(web3.currentProvider, { networkId });

  return { provider, web3, bzxjs };
}

module.exports.initConnectivity = initConnectivity;
