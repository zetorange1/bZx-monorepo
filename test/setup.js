import Web3 from "web3";
import B0xJS from "../src";

const networkUrl = "https://testnet.b0x.network";
const provider = new Web3.providers.HttpProvider(networkUrl);
const b0xJS = new B0xJS(provider);

export default b0xJS;
