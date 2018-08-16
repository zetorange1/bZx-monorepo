/* globals window, document */
import Web3 from "web3";
import ProviderEngine from "web3-provider-engine";
import RpcSubprovider from "web3-provider-engine/subproviders/rpc";

// Ledger
import LedgerWallet from "ledger-wallet-provider";

// Trezor
// import WebsocketSubProvider from 'web3-provider-engine/subproviders/websocket';
// import TrezorWallet from 'trezor-wallet-provider';

const resolveWeb3 = async (resolve, providerName) => {
  let { web3 } = window;
  switch (providerName) {
    case `MetaMask`: {
      const alreadyInjected = typeof web3 !== `undefined`; // i.e. Mist/MetaMask
      if (alreadyInjected) {
        console.log(`Injected web3 detected.`);
        web3 = new Web3(web3.currentProvider);
        resolve(web3);
      } else {
        resolve(false);
      }
      break;
    }
    case `Ledger`: {
      try {
        const engine = new ProviderEngine();
        const networkId = 3; // Ropsten for now
        const LedgerWalletSubprovider = await LedgerWallet(
          () => networkId,
          `44'/60'/0'/0`
        );
        engine.addProvider(LedgerWalletSubprovider);
        engine.addProvider(
          new RpcSubprovider({ rpcUrl: `https://ropsten.infura.io/` })
        );
        engine.start();
        web3 = new Web3(engine);
        resolve(web3);
      } catch (e) {
        console.error(e);
        resolve(false);
      }
      break;
    }
    case `Trezor`: {
      resolve(false);
      /* try {
        const engine = new ProviderEngine();
        const networkId = 3; // Ropsten for now
        const TrezorWalletSubprovider = await TrezorWallet(networkId, `44'/60'/0'/0`);
        engine.addProvider(TrezorWalletSubprovider);
        engine.addProvider(new RpcSubprovider({ rpcUrl: `https://ropsten.infura.io/` }));
        engine.start();
        web3 = new Web3(engine);
        resolve(web3);
      } catch (e) {
        console.error(e);
        resolve(false);
      } */
      break;
    }
    default: {
      resolve(false);
      break;
    }
  }
};

export default function(providerName) {
  return new Promise(resolve => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    console.log(`Connecting to ${providerName}...`);
    window.addEventListener(`load`, () => {
      resolveWeb3(resolve, providerName);
    });
    // If document has loaded already, try to get Web3 immediately.
    if (document.readyState === `complete`) {
      resolveWeb3(resolve, providerName);
    }
  });
}
