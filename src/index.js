import { assert } from "0x.js/lib/src/utils/assert";
import { Web3Wrapper } from "@0xproject/web3-wrapper";
import * as ethUtil from "ethereumjs-util";
import { schemas, SchemaValidator } from "./schemas/b0x_json_schemas";
import * as utils from "./utils";

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(provider) {
    assert.isWeb3Provider("provider", provider);
    this._web3Wrapper = new Web3Wrapper(provider);
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

  async signOrderHashAsync(
    orderHash,
    signerAddress,
    shouldAddPersonalMessagePrefix
  ) {
    assert.isHexString("orderHash", orderHash);
    await assert.isSenderAddressAsync(
      "signerAddress",
      signerAddress,
      this._web3Wrapper
    );

    let msgHashHex = orderHash;
    if (shouldAddPersonalMessagePrefix) {
      const orderHashBuff = ethUtil.toBuffer(orderHash);
      const msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      msgHashHex = ethUtil.bufferToHex(msgHashBuff);
    }

    const signature = await this._web3Wrapper.signTransactionAsync(
      signerAddress,
      msgHashHex
    );

    return signature;
  }
}
