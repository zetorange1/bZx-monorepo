
/*
NOTE: Refer to "node_modules\0x.js\lib\src\0x.js" and other scripts in this path
to see the code for the functions in 0x.js for examples of how b0x.js can be implemented
*/

import * as Web3 from 'web3';
//import {ZeroEx} from '0x.js';
import * as BigNumber from 'bignumber.js';

import { assert } from '../node_modules/0x.js/lib/src/utils/assert.js';
import { schemas, SchemaValidator } from './schemas/b0x_json_schemas.js' 
import { utils } from '../node_modules/0x.js/lib/src/utils/utils.js'
import { signatureUtils } from '../node_modules/0x.js/lib/src/utils/signature_utils.js'

import * as ethABI from 'ethereumjs-abi'
import * as ethUtil from 'ethereumjs-util'

var _ = require('lodash')
var types_1 = require('../node_modules/0x.js/lib/src/types.js')
/*var __assign = (this && this.__assign) || Object.assign || function (t) {
  for (var s, i = 1, n = arguments.length; i < n; i++) {
    s = arguments[i];
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
      t[p] = s[p];
  }
  return t;
}
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var __generator = (this && this.__generator) || function (thisArg, body) {
  var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [0, t.value];
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) _.ops.pop();
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
    if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}*/

/*var getPadded = function (item) {
  return ethUtil.setLengthRight(item, 32);
};*/

export class B0xJS { //extends ZeroEx {

  /*constructor(provider, config) {
    // note: super points to node_modules\0x.js\lib\src\0x.js ZeroEx constructor
    super(provider, config);
    
    //this.b0x_contract = new b0x_contract(...)
  }*/

  doesConformToSchema = function (variableName, value, schema) {
    var schemaValidator = new SchemaValidator();
    var validationResult = schemaValidator.validate(value, schema);
    var hasValidationErrors = validationResult.errors.length > 0;
    var msg = "Expected " + variableName + " to conform to schema " + schema.id + "\nEncountered: " + JSON.stringify(value, null, '\t') + "\nValidation errors: " + validationResult.errors.join(', ');
    assert.assert(!hasValidationErrors, msg);
  };

  getLendOrderHashHex = function (order) {
    this.doesConformToSchema('lendOrder', order, schemas.lendOrderSchema);
    var orderParams = [
      { value: order.b0x, type: types_1.SolidityTypes.Address },
      { value: order.maker, type: types_1.SolidityTypes.Address },
      { value: order.lendTokenAddress, type: types_1.SolidityTypes.Address },
      { value: order.interestTokenAddress, type: types_1.SolidityTypes.Address },
      { value: order.marginTokenAddress, type: types_1.SolidityTypes.Address },
      { value: order.feeRecipientAddress, type: types_1.SolidityTypes.Address },
      { value: utils.bigNumberToBN(order.lendTokenAmount), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.interestAmount), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.initialMarginAmount), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.liquidationMarginAmount), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.lenderRelayFee), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.traderRelayFee), type: types_1.SolidityTypes.Uint256 },      
      { value: utils.bigNumberToBN(order.expirationUnixTimestampSec), type: types_1.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.salt), type: types_1.SolidityTypes.Uint256 }
    ];
    var types = _.map(orderParams, function (o) { return o.type; });
    var values = _.map(orderParams, function (o) { return o.value; });
    var hashBuff = ethABI.soliditySHA3(types, values);
    var orderHashHex = ethUtil.bufferToHex(hashBuff);
    return orderHashHex;
  };

  
    
  /*
    NOTE: this is copied from 0x.js
    There may be an easier way to implement this than below


    signLendOrderHashAsync = function (orderHash, signerAddress) {
    return ZeroEx.prototype.__awaiter(this, void 0, void 0, function () {
      var msgHashHex, nodeVersion, isParityNode, isTestRpc, orderHashBuff, msgHashBuff, signature, validVParamValues, ecSignatureVRS, isValidVRSSignature, ecSignatureRSV, isValidRSVSignature;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            assert.isHexString('orderHash', orderHash);
            return [4, assert.isSenderAddressAsync('signerAddress', signerAddress, this._web3Wrapper)];
          case 1:
            _a.sent();
            return [4, this._web3Wrapper.getNodeVersionAsync()];
          case 2:
            nodeVersion = _a.sent();
            isParityNode = utils.isParityNode(nodeVersion);
            isTestRpc = utils.isTestRpc(nodeVersion);
            if (isParityNode || isTestRpc) {
              // Parity and TestRpc nodes add the personalMessage prefix itself
              msgHashHex = orderHash;
            }
            else {
              orderHashBuff = ethUtil.toBuffer(orderHash);
              msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
              msgHashHex = ethUtil.bufferToHex(msgHashBuff);
            }
            return [4, this._web3Wrapper.signTransactionAsync(signerAddress, msgHashHex)];
          case 3:
            signature = _a.sent();
            validVParamValues = [27, 28];
            ecSignatureVRS = signatureUtils.parseSignatureHexAsVRS(signature);
            if (_.includes(validVParamValues, ecSignatureVRS.v)) {
              isValidVRSSignature = ZeroEx.isValidSignature(orderHash, ecSignatureVRS, signerAddress);
              if (isValidVRSSignature) {
                return [2, ecSignatureVRS];
              }
            }
            ecSignatureRSV = signatureUtils.parseSignatureHexAsRSV(signature);
            if (_.includes(validVParamValues, ecSignatureRSV.v)) {
              isValidRSVSignature = ZeroEx.isValidSignature(orderHash, ecSignatureRSV, signerAddress);
              if (isValidRSVSignature) {
                return [2, ecSignatureRSV];
              }
            }
            throw new Error(types_1.ZeroExError.InvalidSignature);
        }
      });
    });
  };*/

  /*generateOrder: function (networkId, b0xContract, sideToAssetToken, orderExpiryTimestamp, orderTakerAddress, orderMakerAddress, makerFee, takerFee, feeRecipient, signatureData, tokenByAddress, orderSalt) {
    var makerToken = tokenByAddress[sideToAssetToken[types_1.Side.deposit].address];
    var takerToken = tokenByAddress[sideToAssetToken[types_1.Side.receive].address];
    var order = {
      maker: {
        address: orderMakerAddress,
        token: {
          name: makerToken.name,
          symbol: makerToken.symbol,
          decimals: makerToken.decimals,
          address: makerToken.address,
        },
        amount: sideToAssetToken[types_1.Side.deposit].amount.toString(),
        feeAmount: makerFee.toString(),
      },
      taker: {
        address: orderTakerAddress,
        token: {
          name: takerToken.name,
          symbol: takerToken.symbol,
          decimals: takerToken.decimals,
          address: takerToken.address,
        },
        amount: sideToAssetToken[types_1.Side.receive].amount.toString(),
        feeAmount: takerFee.toString(),
      },
      expiration: orderExpiryTimestamp.toString(),
      feeRecipient: feeRecipient,
      salt: orderSalt.toString(),
      signature: signatureData,
      exchangeContract: exchangeContract,
      networkId: networkId,
    };
    return order;
  };*/
}
