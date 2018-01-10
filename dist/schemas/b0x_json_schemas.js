"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

var jsonschema_1 = require("jsonschema");
var _ = require("lodash");

exports.ValidatorResult = jsonschema_1.ValidatorResult;

var basic_type_schemas_1 = require("@0xproject/json-schemas/lib/schemas/basic_type_schemas.js");
var ec_signature_schema_1 = require("@0xproject/json-schemas/lib/schemas/ec_signature_schema.js");
var order_schemas_1 = require("./b0x_order_schemas.js");
exports.schemas = {
    numberSchema: basic_type_schemas_1.numberSchema,
    addressSchema: basic_type_schemas_1.addressSchema,
    ecSignatureSchema: ec_signature_schema_1.ecSignatureSchema,
    ecSignatureParameterSchema: ec_signature_schema_1.ecSignatureParameterSchema,
    lendOrderSchema: order_schemas_1.lendOrderSchema,
    signedLendOrderSchema: order_schemas_1.signedLendOrderSchema
};

var SchemaValidator = function () {
    function SchemaValidator() {
        this.validator = new jsonschema_1.Validator();
        for (var _i = 0, _a = _.values(exports.schemas); _i < _a.length; _i++) {
            var schema = _a[_i];
            this.validator.addSchema(schema, schema.id);
        }
    }
    SchemaValidator.prototype.addSchema = function (schema) {
        this.validator.addSchema(schema, schema.id);
    };
    // In order to validate a complex JS object using jsonschema, we must replace any complex
    // sub-types (e.g BigNumber) with a simpler string representation. Since BigNumber and other
    // complex types implement the `toString` method, we can stringify the object and
    // then parse it. The resultant object can then be checked using jsonschema.
    SchemaValidator.prototype.validate = function (instance, schema) {
        var jsonSchemaCompatibleObject = JSON.parse(JSON.stringify(instance));
        return this.validator.validate(jsonSchemaCompatibleObject, schema);
    };
    SchemaValidator.prototype.isValid = function (instance, schema) {
        var isValid = this.validate(instance, schema).errors.length === 0;
        return isValid;
    };
    return SchemaValidator;
}();
exports.SchemaValidator = SchemaValidator;