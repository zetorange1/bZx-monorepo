/* globals test, expect */

const Web3 = require("web3");
const B0xJS = require("../dist/b0x").default;
const sigUtil = require("eth-sig-util");

const networkUrl = "https://testnet.b0x.network";
const provider = new Web3.providers.HttpProvider(networkUrl);

const b0xJS = new B0xJS(provider);

test("signOrderHashAsync signs properly", async () => {
  const order = {
    b0xAddress: "0x0000000000000000000000000000000000000000",
    makerAddress: "0x0000000000000000000000000000000000000000",
    networkId: 1,

    // addresses
    loanTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    interestTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    collateralTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    feeRecipientAddress: "0x0000000000000000000000000000000000000000",
    oracleAddress: "0x0000000000000000000000000000000000000000",

    // token amounts
    loanTokenAmount: "40",
    interestAmount: "41",

    // margin amounts
    initialMarginAmount: "40",
    maintenanceMarginAmount: "20",

    // relay fees
    lenderRelayFee: "0",
    traderRelayFee: "0",

    // expiration date/time
    expirationUnixTimestampSec: "1519061340",
    salt: "0.2019429563929979"
  };

  const [signerAddress] = await b0xJS.web3.eth.getAccounts();

  const orderHash = B0xJS.getLoanOrderHashHex(order);
  const signature = await b0xJS.signOrderHashAsync(orderHash, signerAddress);

  // Not sure why this doesn't work
  // const recoveredAccount = await b0xJS.web3.eth.accounts.recover(
  //   orderHash,
  //   signature
  // );
  const recoveredAccount = sigUtil.recoverPersonalSignature({
    data: orderHash,
    sig: signature
  });
  expect(recoveredAccount).toBe(signerAddress.toLowerCase());
});
