import BZxJS from "bzx-js"; // eslint-disable-line
import { toBigNumber } from "../../common/utils";
import getNetworkId from "../../web3/getNetworkId";

export const compileObject = async (web3, state, account, bZx) => {
  const { sendToRelayExchange } = state;
  return {
    bZxAddress: bZx.addresses.BZx,
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
  const salt = BZxJS.generatePseudoRandomSalt();
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

export const signOrder = async (orderHash, accounts, bZx) => {
  if (bZx.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this action on your device.`);
  }
  let signature;
  try {
    signature = await bZx.signOrderHashAsync(
      orderHash,
      accounts[0].toLowerCase(),
      bZx.portalProviderName === `MetaMask`
    );
  } catch (e) {
    console.error(e.message);
    alert(`Unable to sign this order. Please try again.`);
    return null;
  }
  alert();

  const isValidSignature = BZxJS.isValidSignature({
    account: accounts[0].toLowerCase(),
    orderHash,
    signature
  });
  const isValidSignatureBZx = await bZx.isValidSignatureAsync({
    account: accounts[0].toLowerCase(),
    orderHash,
    signature
  });
  console.log(`${signature} isValidSignature`, isValidSignature);
  console.log(`${signature} isValidSignatureBZx`, isValidSignatureBZx);
  return signature;
};

export const getOrderHash = obj => BZxJS.getLoanOrderHashHex(obj);
