// TODO - validate JSON order
export const validateJSONOrder = order => {
  console.log(`validating JSON order`, order);
  return true;
};

// TODO - validate fill order submission
export const validateFillOrder = (
  order,
  fillOrderAmount,
  marginTokenAddress
) => {
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
