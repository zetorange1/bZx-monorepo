import { assert } from "0x.js/lib/src/utils/assert";
import { schemas, SchemaValidator } from "./schemas/b0x_json_schemas";

import * as utils from "./utils";

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(props) {
    console.log(props);
  }

  // WARNING - this method is not supposed to be here,
  // in the original ZeroEx source code, it is a function
  // from the utils/assert library. We should move this out
  // so as to not pollute this file
  static doesConformToSchema(variableName, value, schema) {
    const schemaValidator = new SchemaValidator();
    const validationResult = schemaValidator.validate(value, schema);
    const hasValidationErrors = validationResult.errors.length > 0;
    const msg = `Expected ${variableName} to conform to schema ${
      schema.id
    }\nEncountered: ${JSON.stringify(
      value,
      null,
      "\t"
    )}\nValidation errors: ${validationResult.errors.join(", ")}`;
    assert.assert(!hasValidationErrors, msg);
  }

  static getLoanOrderHashHex(order) {
    this.doesConformToSchema("loanOrder", order, schemas.loanOrderSchema);
    const orderHashHex = utils.getLoanOrderHashHex(order);
    return orderHashHex;
  }
}
