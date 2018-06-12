/* globals window, document */
import Web3 from "web3";
import ProviderEngine from "web3-provider-engine";

// Ledger
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import createLedgerSubprovider from "@ledgerhq/web3-subprovider";
import FetchSubprovider from "web3-provider-engine/subproviders/fetch";

// Trezor
// import WebsocketSubProvider from 'web3-provider-engine/subproviders/websocket';
// import TrezorWalletSubProviderFactory from 'trezor-wallet-provider';

const resolveWeb3 = (resolve, providerName) => {
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
        const getTransport = () => TransportU2F.create();
        const ledger = createLedgerSubprovider(getTransport, {
          networkId: 3,
          accountsLength: 5
        });
        engine.addProvider(ledger);
        engine.addProvider(
          new FetchSubprovider({ rpcUrl: `https://ropsten.infura.io/` })
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
      // let { web3 } = window;
      /* if (typeof web3 !== `undefined` && web3.currentProvider.host && web3.currentProvider.host.indexOf('infura') !== -1) {
          console.log(`Injected web3 detected.`);
          web3 = new Web3(web3.currentProvider);
          resolve(web3);
        } else { */
      /* const engine = new ProviderEngine();
          web3 = new Web3(engine);
          //const networkId = 3;
          //window.web3 = web3;
          console.log(web3.currentProvider);
          console.log(web3.currentProvider.host);
          TrezorWalletSubProviderFactory(3, `m/44'/0'/0'`).then(function(trezorWalletSubProvider) {  // () => networkId, `44'/60'/0'/0`); -> https://github.com/Neufund/ledger-wallet-provider/issues/18
            console.log(trezorWalletSubProvider);
            engine.addProvider(trezorWalletSubProvider);
            engine.addProvider(new WebsocketSubProvider({ rpcUrl: `https://ropsten.infura.io/` }));
            engine.start();
            resolve(web3);
          }); */
      // }
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
