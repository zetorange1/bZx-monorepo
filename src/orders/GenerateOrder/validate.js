const validRange = (min, max, val) => {
  if (val <= max && val >= min) {
    return true;
  }
  throw new Error(`Invalid range`);
};

// TODO - add more validation
export default state => {
  const { initialMarginAmount, liquidationMarginAmount } = state;
  try {
    validRange(10, 100, initialMarginAmount);
    validRange(5, 95, liquidationMarginAmount);
  } catch (error) {
    // eslint-disable-next-line no-undef
    alert(`Margin amounts are out of range.`);
    return false;
  }
  return true;
};
