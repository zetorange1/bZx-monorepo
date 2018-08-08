exports.loanOrderSchema = {
  id: "/loanOrder",
  properties: {
    bZxAddress: { $ref: "/Address" },
    makerAddress: { $ref: "/Address" },
    loanTokenAddress: { $ref: "/Address" },
    interestTokenAddress: { $ref: "/Address" },
    collateralTokenAddress: { $ref: "/Address" },
    feeRecipientAddress: { $ref: "/Address" },
    oracleAddress: { $ref: "/Address" },
    loanTokenAmount: { $ref: "/Number" },
    interestAmount: { $ref: "/Number" },
    initialMarginAmount: { $ref: "/Number" },
    maintenanceMarginAmount: { $ref: "/Number" },
    lenderRelayFee: { $ref: "/Number" },
    traderRelayFee: { $ref: "/Number" },
    expirationUnixTimestampSec: { $ref: "/Number" },
    makerRole: { $ref: "/Number" },
    salt: { $ref: "/Number" }
  },
  required: [
    "bZxAddress",
    "makerAddress",
    "loanTokenAddress",
    "interestTokenAddress",
    "collateralTokenAddress",
    "feeRecipientAddress",
    "oracleAddress",
    "loanTokenAmount",
    "interestAmount",
    "initialMarginAmount",
    "maintenanceMarginAmount",
    "lenderRelayFee",
    "traderRelayFee",
    "expirationUnixTimestampSec",
    "makerRole",
    "salt"
  ],
  type: "object"
};
exports.signedLoanOrderSchema = {
  id: "/signedLoanOrder",
  allOf: [
    { $ref: "/loanOrder" },
    {
      properties: {
        ecSignature: { $ref: "/ECSignature" }
      },
      required: ["ecSignature"]
    }
  ]
};
