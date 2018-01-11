'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.B0xJS = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
/*
NOTE: Refer to "node_modules\0x.js\lib\src\0x.js" and other scripts in this path
to see the code for the functions in 0x.js for examples of how b0x.js can be implemented
*/

//import {ZeroEx} from '0x.js';


var _web = require('web3');

var Web3 = _interopRequireWildcard(_web);

var _bignumber = require('bignumber.js');

var BigNumber = _interopRequireWildcard(_bignumber);

var _assert = require('0x.js/lib/src/utils/assert.js');

var _b0x_json_schemas = require('./schemas/b0x_json_schemas.js');

var _utils = require('0x.js/lib/src/utils/utils.js');

var _signature_utils = require('0x.js/lib/src/utils/signature_utils.js');

var _ethereumjsAbi = require('ethereumjs-abi');

var ethABI = _interopRequireWildcard(_ethereumjsAbi);

var _ethereumjsUtil = require('ethereumjs-util');

var ethUtil = _interopRequireWildcard(_ethereumjsUtil);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var types_1 = require('0x.js/lib/src/types.js');
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

var B0xJS = exports.B0xJS = function () {
  //extends ZeroEx {

  /*constructor(provider, config) {
    // note: super points to node_modules\0x.js\lib\src\0x.js ZeroEx constructor
    super(provider, config);
    
    //this.b0x_contract = new b0x_contract(...)
  }*/

  function B0xJS() {
    _classCallCheck(this, B0xJS);

    this.getLendOrderHashHex = this.getLendOrderHashHex.bind(this);
  }

  _createClass(B0xJS, [{
    key: 'doesConformToSchema',
    value: function doesConformToSchema(variableName, value, schema) {
      var schemaValidator = new _b0x_json_schemas.SchemaValidator();
      var validationResult = schemaValidator.validate(value, schema);
      var hasValidationErrors = validationResult.errors.length > 0;
      var msg = "Expected " + variableName + " to conform to schema " + schema.id + "\nEncountered: " + JSON.stringify(value, null, '\t') + "\nValidation errors: " + validationResult.errors.join(', ');
      _assert.assert.assert(!hasValidationErrors, msg);
    }
  }, {
    key: 'getLendOrderHashHex',
    value: function getLendOrderHashHex(order) {
      this.doesConformToSchema('lendOrder', order, _b0x_json_schemas.schemas.lendOrderSchema);
      var orderParams = [{ value: order.b0x, type: types_1.SolidityTypes.Address }, { value: order.maker, type: types_1.SolidityTypes.Address }, { value: order.lendTokenAddress, type: types_1.SolidityTypes.Address }, { value: order.interestTokenAddress, type: types_1.SolidityTypes.Address }, { value: order.marginTokenAddress, type: types_1.SolidityTypes.Address }, { value: order.feeRecipientAddress, type: types_1.SolidityTypes.Address }, { value: _utils.utils.bigNumberToBN(order.lendTokenAmount), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.interestAmount), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.initialMarginAmount), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.liquidationMarginAmount), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.lenderRelayFee), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.traderRelayFee), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.expirationUnixTimestampSec), type: types_1.SolidityTypes.Uint256 }, { value: _utils.utils.bigNumberToBN(order.salt), type: types_1.SolidityTypes.Uint256 }];
      var types = _.map(orderParams, function (o) {
        return o.type;
      });
      var values = _.map(orderParams, function (o) {
        return o.value;
      });
      var hashBuff = ethABI.soliditySHA3(types, values);
      var orderHashHex = ethUtil.bufferToHex(hashBuff);
      return orderHashHex;
    }
  }]);

  return B0xJS;
}();