/* globals jest */
import Web3 from "web3";
import moment from "moment";
import B0xJS from "../src";

jest.setTimeout(moment.duration(10, "seconds").asMilliseconds());

const networkUrl = "https://testnet.b0x.network";
const provider = new Web3.providers.HttpProvider(networkUrl);
const b0xJS = new B0xJS(provider);

export default b0xJS;
