const { BZxJS } = require("@bzxnetwork/bzx.js");

async function getBZX(web3) {
  const networkId = await web3.eth.net.getId();
  return new BZxJS(web3, { networkId });
}

module.exports = {
  getBZX
};
