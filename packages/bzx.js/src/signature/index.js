import sigUtil from "eth-sig-util";
import * as ethUtil from "ethereumjs-util";
import { assert } from "@0xproject/assert";
import _ from "lodash";
import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import { signatureUtils } from "../signature/signature_utils";

const SignatureTypeStr = Object.freeze({
  "Illegal": "00",
  "Invalid": "01",
  "EIP712": "02",
  "EthSign": "03",
  "Caller": "04",
  "Wallet": "05",
  "Validator": "06",
  "PreSigned": "07",
  "Trezor": "08",
});

export const signOrderHashAsync = async (
  { web3 },
  orderHash,
  signerAddress,
  // Metamask provider needs shouldAddPersonalMessagePrefix to be true
  shouldAddPersonalMessagePrefix
) => {
  assert.isHexString("orderHash", orderHash);
  assert.isETHAddressHex("signerAddress", signerAddress);
  const nodeVersion = web3.version.node;
  const isParityNode = _.includes(nodeVersion, "Parity");
  const isTestRpc = _.includes(nodeVersion, "TestRPC");
  let signature = null;

  if (isParityNode || isTestRpc) {
    // Parity and TestRpc nodes add the personalMessage prefix itself
    signature = await web3.eth.sign(orderHash, signerAddress);
  } else {
    let msgHashHex = orderHash;
    if (shouldAddPersonalMessagePrefix) {
      const orderHashBuff = ethUtil.toBuffer(orderHash);
      const msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      msgHashHex = ethUtil.bufferToHex(msgHashBuff);
    }
    signature = await web3.eth.sign(msgHashHex, signerAddress);
  }

  // HACK: There is no consensus on whether the signatureHex string should be formatted as
  // v + r + s OR r + s + v, and different clients (even different versions of the same client)
  // return the signature params in different orders. In order to support all client implementations,
  // we parse the signature in both ways, and evaluate if either one is a valid signature.
  const validVParamValues = [27, 28];
  const ecSignatureVRS = signatureUtils.parseSignatureHexAsVRS(signature);
  if (_.includes(validVParamValues, ecSignatureVRS.v)) {
    const isValidVRSSignature = signatureUtils.isValidSignature(
      orderHash,
      ecSignatureVRS,
      signerAddress
    );
    if (isValidVRSSignature) {
      return ethUtil.toRpcSig(
        ecSignatureVRS.v,
        ecSignatureVRS.r,
        ecSignatureVRS.s
      ) + SignatureTypeStr.EthSign;
    }
  }

  const ecSignatureRSV = signatureUtils.parseSignatureHexAsRSV(signature);
  if (_.includes(validVParamValues, ecSignatureRSV.v)) {

    const isValidRSVSignature = signatureUtils.isValidSignature(
      orderHash,
      ecSignatureRSV,
      signerAddress
    );
    if (isValidRSVSignature) {
      return ethUtil.toRpcSig(
        ecSignatureRSV.v,
        ecSignatureRSV.r,
        ecSignatureRSV.s
      ) + SignatureTypeStr.EthSign;
    }
  }

  throw new Error("InvalidSignature");
};

export const isValidSignature = ({ account, orderHash, signature }) => {

  // hack to support 0x v2 EthSign SignatureType format
  // recoverPersonalSignature assumes no SignatureType ending
  signature = signature.substr(0, 132); // eslint-disable-line no-param-reassign

  const recoveredAccount = sigUtil.recoverPersonalSignature({
    data: orderHash,
    sig: signature
  });
  return recoveredAccount === account;
};

export const isValidSignatureAsync = async (
  { web3, networkId },
  { account, orderHash, signature }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  // hack to support 0x v2 EthSign SignatureType format
  // bZx requires SignatureType ending
  signature = signature.substr(0, 132) + SignatureTypeStr.EthSign; // eslint-disable-line no-param-reassign

  return bZxContract.methods
    .isValidSignature(account, orderHash, signature)
    .call();
};
