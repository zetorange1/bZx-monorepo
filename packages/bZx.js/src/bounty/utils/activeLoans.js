import { pipe, map } from "ramda";
import * as OrderHistoryUtils from "../../orderHistory/utils/index";

const NUM_LOAN_FIELDS = 3;

const getLoan = params => ({
  loanOrderHash: OrderHistoryUtils.prepend0x(params[0]),
  trader: pipe(OrderHistoryUtils.substr24, OrderHistoryUtils.prepend0x)(
    params[1]
  ),
  expirationUnixTimestampSec: OrderHistoryUtils.parseIntHex(params[2])
});

const checkProperObjCount = OrderHistoryUtils.makeCheckProperObjCount(
  NUM_LOAN_FIELDS
);
const getOrderObjArray = OrderHistoryUtils.makeGetOrderObjArray(
  NUM_LOAN_FIELDS
);

export const cleanData = raw =>
  raw
    ? pipe(
        OrderHistoryUtils.remove0xPrefix,
        checkProperObjCount,
        getOrderObjArray,
        map(pipe(OrderHistoryUtils.getOrderParams, getLoan))
      )(raw)
    : [];
