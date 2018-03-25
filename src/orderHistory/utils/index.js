const ORDER_FIELD_COUNT = 14;
const SOMETHING = 64;

const remove0xPrefix = data => data.substr(2);
const getOrderObjArray = data =>
  data.match(new RegExp(`.{1,${ORDER_FIELD_COUNT * SOMETHING}}`, "g"));
const getOrder = data => data.match(new RegExp(`.{1,${SOMETHING}}`, "g"));

export const cleanData = raw => {
  const no0x = remove0xPrefix(raw);
  const objCount = no0x.length / SOMETHING / ORDER_FIELD_COUNT;
  if (objCount % 1 !== 0) throw new Error("Must be whole number of objects");

  const orderObjArray = getOrderObjArray(no0x);

  const hexRadix = 16;
  const orders = orderObjArray.map(orderObj => {
    const params = getOrder(orderObj);
    return {
      maker: `0x${params[0].substr(24)}`,
      loanTokenAddress: `0x${params[1].substr(24)}`,
      interestTokenAddress: `0x${params[2].substr(24)}`,
      collateralTokenAddress: `0x${params[3].substr(24)}`,
      feeRecipientAddress: `0x${params[4].substr(24)}`,
      oracleAddress: `0x${params[5].substr(24)}`,
      loanTokenAmount: parseInt(`0x${params[6]}`, hexRadix),
      interestAmount: parseInt(`0x${params[7]}`, hexRadix),
      initialMarginAmount: parseInt(`0x${params[8]}`, hexRadix),
      maintenanceMarginAmount: parseInt(`0x${params[9]}`, hexRadix),
      lenderRelayFee: parseInt(`0x${params[10]}`, hexRadix),
      traderRelayFee: parseInt(`0x${params[11]}`, hexRadix),
      expirationUnixTimestampSec: parseInt(`0x${params[12]}`, hexRadix),
      loanOrderHash: `0x${params[13]}`
    };
  });
  return orders;
};
