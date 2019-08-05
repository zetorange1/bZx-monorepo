const { Logger } = require("./LoggerFactory");
const Web3 = require("web3");
const HDWalletProvider = require("truffle-hdwallet-provider");
const PrivateKeyProvider = require("truffle-privatekey-provider");

const secrets = require("../../../config/secrets.js");
const consts = require("./../consts.js");

const getWeb3 = (network) => {
  // eslint-disable-next-line one-var
  let provider, providerWS;
  if (network !== "development") {
    if (consts.walletType === "mnemonic") {

      const infuraAuth = secrets.infura_apikey ? `${secrets.infura_apikey}/` : "";
      provider = new HDWalletProvider(secrets.mnemonic[network], `https://${network}.infura.io/${infuraAuth}`);
      // https://github.com/ethereum/web3.js/issues/1559
      // but web3@1.0.0-beta.36 is not yet available
      providerWS = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws`);
    } else if (consts.walletType === "ledger") {
      // TODO: ledger code
      process.exit();
    } else if (consts.walletType === "private_key") {
      if (!secrets.private_key[network]) {
        Logger.log("error", "Private Key missing from secrets.js file!");
        process.exit();
      }
      const infuraAuth = secrets.infura_apikey ? `${secrets.infura_apikey}/` : "";
      const privateKey = secrets.private_key[network];
      provider = new PrivateKeyProvider(privateKey, `https://${network}.infura.io/${infuraAuth}`);
      providerWS = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws`);
    } else {
      process.exit();
    }
  } else {
    provider = new Web3.providers.HttpProvider("http://localhost:8545");
  }

  // init web3 and web3ws
  const web3 = new Web3(provider);

  let web3WS = null;
  if (providerWS) web3WS = new Web3(providerWS);

  return { web3, web3WS };
};

module.exports = {
  getWeb3
};
