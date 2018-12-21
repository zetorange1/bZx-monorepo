exports.loanOrderSchema = {
  id: "/loanOrder",
  properties: {
    bZxAddress: { $ref: "/Address" },
    makerAddress: { $ref: "/Address" },
    takerAddress: { $ref: "/Address" },
    loanTokenAddress: { $ref: "/Address" },
    interestTokenAddress: { $ref: "/Address" },
    collateralTokenAddress: { $ref: "/Address" },
    feeRecipientAddress: { $ref: "/Address" },
    tradeTokenToFillAddress: { $ref: "/Address" },
    oracleAddress: { $ref: "/Address" },
    loanTokenAmount: { $ref: "/Number" },
    interestAmount: { $ref: "/Number" },
    initialMarginAmount: { $ref: "/Number" },
    maintenanceMarginAmount: { $ref: "/Number" },
    lenderRelayFee: { $ref: "/Number" },
    traderRelayFee: { $ref: "/Number" },
    maxDurationUnixTimestampSec: { $ref: "/Number" },
    expirationUnixTimestampSec: { $ref: "/Number" },
    makerRole: { $ref: "/Number" },
    withdrawOnOpen: { $ref: "/Number" },
    salt: { $ref: "/Number" }
  },
  required: [
    "bZxAddress",
    "makerAddress",
    "takerAddress",
    "loanTokenAddress",
    "interestTokenAddress",
    "collateralTokenAddress",
    "feeRecipientAddress",
    "tradeTokenToFillAddress",
    "oracleAddress",
    "loanTokenAmount",
    "interestAmount",
    "initialMarginAmount",
    "maintenanceMarginAmount",
    "lenderRelayFee",
    "traderRelayFee",
    "maxDurationUnixTimestampSec",
    "expirationUnixTimestampSec",
    "makerRole",
    "withdrawOnOpen",
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
