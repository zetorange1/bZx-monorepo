import B0xJS from "b0x.js";  // eslint-disable-line

export const getOrderHash = order => B0xJS.getLoanOrderHashHex(order);

// TODO - validate fill order submission
export const validateFillOrder = (
  order,
  fillOrderAmount,
  marginTokenAddress
) => {
  const role = order.makerRole === `0` ? `lender` : `trader`;
  if (role === `lender`) {
    // check that I have sufficient loanToken to lend
  } else {
    // check that I have sufficient collateralToken and interestToken
  }
  console.log(`validateFillOrder`);
  console.log(order, fillOrderAmount, marginTokenAddress);
  return true;
};

// TODO - submit the fill order request
export const submitFillOrder = (order, fillOrderAmount, marginTokenAddress) => {
  console.log(`submitFillOrder`);
  console.log(order, fillOrderAmount, marginTokenAddress);
  return true;
};
