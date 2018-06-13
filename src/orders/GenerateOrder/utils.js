import B0xJS from "b0x.js"; // eslint-disable-line
import { toBigNumber } from "../../common/utils";
import getNetworkId from "../../web3/getNetworkId";

export const compileObject = async (web3, state, account, b0x) => {
  const { sendToRelayExchange } = state;
  return {
    b0xAddress: b0x.addresses.B0x,
    makerAddress: account.toLowerCase(),
    makerRole: (state.role === `lender` ? 0 : 1).toString(),

    // addresses
    loanTokenAddress: state.loanTokenAddress,
    interestTokenAddress: state.interestTokenAddress,
    collateralTokenAddress:
      state.role === `lender`
        ? `0x0000000000000000000000000000000000000000`
        : state.collateralTokenAddress,
    feeRecipientAddress: sendToRelayExchange
      ? state.feeRecipientAddress
      : `0x0000000000000000000000000000000000000000`,
    oracleAddress: state.oracleAddress,

    // token amounts
    loanTokenAmount: toBigNumber(state.loanTokenAmount, 1e18).toFixed(0),
    interestAmount: toBigNumber(state.interestAmount, 1e18).toFixed(0),

    // margin amounts
    initialMarginAmount: state.initialMarginAmount.toString(),
    maintenanceMarginAmount: state.maintenanceMarginAmount.toString(),

    // relay fees
    lenderRelayFee: toBigNumber(
      sendToRelayExchange ? state.lenderRelayFee : 0,
      1e18
    ).toFixed(0),
    traderRelayFee: toBigNumber(
      sendToRelayExchange ? state.traderRelayFee : 0,
      1e18
    ).toFixed(0),

    // expiration date/time
    expirationUnixTimestampSec: state.expirationDate.unix().toString()
  };
};

export const addSalt = obj => {
  const salt = B0xJS.generatePseudoRandomSalt();
  return {
    ...obj,
    salt
  };
};

export const addNetworkId = async (order, web3) => {
  const networkId = await getNetworkId(web3);
  return {
    ...order,
    networkId
  };
};

export const signOrder = async (orderHash, accounts, b0x) => {
  if (b0x.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this action on your device.`);
  }
  let signature;
  try {
    signature = await b0x.signOrderHashAsync(
      orderHash,
      accounts[0].toLowerCase(),
      b0x.portalProviderName === `MetaMask`
    );
  } catch (e) {
    console.error(e.message);
    alert(`Unable to sign this order. Please try again.`);
    return null;
  }
  alert();

  const isValidSignature = B0xJS.isValidSignature({
    account: accounts[0].toLowerCase(),
    orderHash,
    signature
  });
  const isValidSignatureB0x = await b0x.isValidSignatureAsync({
    account: accounts[0].toLowerCase(),
    orderHash,
    signature
  });
  console.log(`${signature} isValidSignature`, isValidSignature);
  console.log(`${signature} isValidSignatureB0x`, isValidSignatureB0x);
  return signature;
};

export const getOrderHash = obj => B0xJS.getLoanOrderHashHex(obj);
