import { assert } from '0x.js/lib/src/utils/assert';
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
    const orderHashHex = utils.getLendOrderHashHex(order);
    return orderHashHex;
  }
}
