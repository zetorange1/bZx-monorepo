import { getTrackedTokens } from "../Balances/utils";

const validRange = (min, max, val) => {
  if (val <= max && val >= min) {
    return true;
  }
  throw new Error(`Invalid range`);
};

const checkCoinsAdded = ({
  loanTokenAddress,
  interestTokenAddress,
  collateralTokenAddress
}) => {
  const trackedTokens = getTrackedTokens();
  const a = trackedTokens.includes(loanTokenAddress);
  const b = trackedTokens.includes(interestTokenAddress);
  const c = trackedTokens.includes(collateralTokenAddress);
  if (a && b && c) {
    return true;
  }
  alert(
    `Some of your selected tokens have not been added to the tracked tokens list. Please go to the Balances tab and add these tokens.`
  );
  return false;
};

// TODO - check if the coins have been approved
// eslint-disable-next-line
const checkCoinsApproved = () => {
  console.log(`TODO - check that these coins have been approved`);
  return true;
};

export default state => {
  const { initialMarginAmount, liquidationMarginAmount } = state;
  try {
    validRange(10, 100, initialMarginAmount);
    validRange(5, 95, liquidationMarginAmount);
    if (liquidationMarginAmount > initialMarginAmount) {
      throw Error(
        `Liquidation margin amount cannot be larger than initial margin amount.`
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-undef
    alert(`Margin amounts are invalid: ${error.message}`);
    return false;
  }

  const coinsAdded = checkCoinsAdded(state);
  if (!coinsAdded) {
    return false;
  }

  // const coinsApproved = checkCoinsApproved(state);
  return true;
};
