import ethABI from 'ethereumjs-abi';
import ethUtil from 'ethereumjs-util';
import _ from 'lodash';

import { assert } from '0x.js/lib/src/utils/assert';
import zeroExTypes from '0x.js/lib/src/types';
import { schemas, SchemaValidator } from './schemas/b0x_json_schemas';

import * as utils from './utils';

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(props) {
    console.log(props);
  }

  static doesConformToSchema(variableName, value, schema) {
    const schemaValidator = new SchemaValidator();
    const validationResult = schemaValidator.validate(value, schema);
    const hasValidationErrors = validationResult.errors.length > 0;
    const msg = `Expected ${variableName} to conform to schema ${schema.id}\nEncountered: ${JSON.stringify(value, null, '\t')}\nValidation errors: ${validationResult.errors.join(', ')}`;
    assert.assert(!hasValidationErrors, msg);
  }

  static getLendOrderHashHex(order) {
    this.doesConformToSchema('lendOrder', order, schemas.lendOrderSchema);
    const orderParams = [
      { value: order.b0x, type: zeroExTypes.SolidityTypes.Address },
      { value: order.maker, type: zeroExTypes.SolidityTypes.Address },
      { value: order.lendTokenAddress, type: zeroExTypes.SolidityTypes.Address },
      { value: order.interestTokenAddress, type: zeroExTypes.SolidityTypes.Address },
      { value: order.marginTokenAddress, type: zeroExTypes.SolidityTypes.Address },
      { value: order.feeRecipientAddress, type: zeroExTypes.SolidityTypes.Address },
      { value: utils.bigNumberToBN(order.lendTokenAmount), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.interestAmount), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.initialMarginAmount), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.liquidationMarginAmount), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.lenderRelayFee), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.traderRelayFee), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.expirationUnixTimestampSec), type: zeroExTypes.SolidityTypes.Uint256 },
      { value: utils.bigNumberToBN(order.salt), type: zeroExTypes.SolidityTypes.Uint256 },
    ];
    const types = _.map(orderParams, o => o.type);
    const values = _.map(orderParams, o => o.value);
    const hashBuff = ethABI.soliditySHA3(types, values);
    const orderHashHex = ethUtil.bufferToHex(hashBuff);
    return orderHashHex;
  }
}
