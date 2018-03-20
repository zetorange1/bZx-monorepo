import B0xJS from "b0x.js";  // eslint-disable-line
import { getTrackedTokens } from "../../common/trackedTokens";

export const getOrderHash = order => B0xJS.getLoanOrderHashHex(order);

// TODO - validate fill order submission
export const validateFillOrder = (
  order,
  fillOrderAmount,
  collateralTokenAddress,
  tokens
) => {
  const makerRole = order.makerRole === `0` ? `lender` : `trader`;
  const trackedTokens = getTrackedTokens(tokens);
  if (makerRole === `lender`) {
    // check that user has tracked and approved collateralToken and interestToken
    const { interestTokenAddress } = order;
    if (
      !trackedTokens.includes(interestTokenAddress) ||
      !trackedTokens.includes(collateralTokenAddress)
    ) {
      alert(
        `Your interest token or collateral token is not tracked, please add it in the balances tab.`
      );
      return false;
    }
  } else {
    // check that user has tracked and approved loanToken
    const { loanTokenAddress } = order;
    if (!trackedTokens.includes(loanTokenAddress)) {
      alert(
        `Your loan token is not tracked, please add it in the balances tab.`
      );
      return false;
    }
  }
  console.log(`validateFillOrder`);
  console.log(order, fillOrderAmount, collateralTokenAddress);
  return true;
};

// TODO - submit the fill order request
export const submitFillOrder = (order, fillOrderAmount, marginTokenAddress) => {
  console.log(`submitFillOrder`);
  console.log(order, fillOrderAmount, marginTokenAddress);
  return true;
};
