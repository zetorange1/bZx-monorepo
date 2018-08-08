/* globals jest */
import Web3 from "web3";
import BZxJS from "../index";

// const networkUrl = "https://testnet.bZx.network";
const networkUrl = "http://localhost:8545";
export const networkId = 50;
export const provider = new Web3.providers.HttpProvider(networkUrl);
const bZxJS = new BZxJS(provider, { networkId });

// Testnet mines about every 5-10 sec
jest.setTimeout(100000);

export default bZxJS;
