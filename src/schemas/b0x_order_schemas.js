
exports.lendOrderSchema = {
  id: '/lendOrder',
  properties: {
    b0x: { $ref: '/Address' },
    maker: { $ref: '/Address' },
    lendTokenAddress: { $ref: '/Address' },
    interestTokenAddress: { $ref: '/Address' },
    collateralTokenAddress: { $ref: '/Address' },
    feeRecipientAddress: { $ref: '/Address' },
	  oracleAddress: { $ref: '/Address' },
    lendTokenAmount: { $ref: '/Number' },
    interestAmount: { $ref: '/Number' },
    initialMarginAmount: { $ref: '/Number' },
    liquidationMarginAmount: { $ref: '/Number' },
    lenderRelayFee: { $ref: '/Number' },
    traderRelayFee: { $ref: '/Number' },
    expirationUnixTimestampSec: { $ref: '/Number' },
    salt: { $ref: '/Number' },
  },
  required: [
    'b0x', 'maker', 'lendTokenAddress', 'interestTokenAddress', 'collateralTokenAddress', 'feeRecipientAddress', 'oracleAddress',
    'lendTokenAmount', 'interestAmount', 'initialMarginAmount', 'liquidationMarginAmount',
    'lenderRelayFee', 'traderRelayFee', 'expirationUnixTimestampSec', 'salt',
  ],
  type: 'object',
};
exports.signedLendOrderSchema = {
  id: '/signedLendOrder',
  allOf: [
    { $ref: '/lendOrder' },
    {
      properties: {
        ecSignature: { $ref: '/ECSignature' },
      },
      required: ['ecSignature'],
    },
  ],
};
