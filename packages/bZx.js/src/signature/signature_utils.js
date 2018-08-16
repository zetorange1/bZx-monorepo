import * as ethUtil from 'ethereumjs-util';

export const signatureUtils = {
  isValidSignature(data, signature, signerAddress) {
    const dataBuff = ethUtil.toBuffer(data);
    const msgHashBuff = ethUtil.hashPersonalMessage(dataBuff);
    try {
      const pubKey = ethUtil.ecrecover(
        msgHashBuff,
        signature.v,
        ethUtil.toBuffer(signature.r),
        ethUtil.toBuffer(signature.s));
      const retrievedAddress = ethUtil.bufferToHex(ethUtil.pubToAddress(pubKey));
      return retrievedAddress === signerAddress;
    } catch (err) {
      return false;
    }
  },

  parseSignatureHexAsVRS(signatureHex) {
    const signatureBuffer = ethUtil.toBuffer(signatureHex);
    let v = signatureBuffer[0];
    if (v < 27) {
      v += 27;
    }
    const r = signatureBuffer.slice(1, 33);
    const s = signatureBuffer.slice(33, 65);
    const ecSignature = {
      v,
      r: ethUtil.bufferToHex(r),
      s: ethUtil.bufferToHex(s),
    };
    return ecSignature;
  },

  parseSignatureHexAsRSV(signatureHex) {
    const {v, r, s} = ethUtil.fromRpcSig(signatureHex);
    const ecSignature = {
      v,
      r: ethUtil.bufferToHex(r),
      s: ethUtil.bufferToHex(s),
    };
    return ecSignature;
  },
};
