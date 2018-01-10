Object.defineProperty(exports, '__esModule', { value: true });

exports.lendOrderSchema = {
  id: '/lendOrder',
  properties: {
    b0x: { $ref: '/Address' },
    maker: { $ref: '/Address' },
    lendTokenAddress: { $ref: '/Address' },
    interestTokenAddress: { $ref: '/Address' },
    marginTokenAddress: { $ref: '/Address' },
    feeRecipientAddress: { $ref: '/Address' },
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
    'b0x', 'maker', 'lendTokenAddress', 'interestTokenAddress', 'marginTokenAddress', 'feeRecipientAddress',
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
