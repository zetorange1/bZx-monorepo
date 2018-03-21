import { getTrackedTokens } from "../../common/trackedTokens";

const validRange = (min, max, val) => {
  if (val <= max && val >= min) {
    return true;
  }
  throw new Error(`Invalid range`);
};

const checkCoinsAdded = (
  { loanTokenAddress, interestTokenAddress, collateralTokenAddress, role },
  tokens
) => {
  const trackedTokens = getTrackedTokens(tokens);
  const a = trackedTokens.includes(loanTokenAddress);
  const b = trackedTokens.includes(interestTokenAddress);
  const c = trackedTokens.includes(collateralTokenAddress);
  const cPrime = role === `lender` ? true : c;
  if (a && b && cPrime) {
    return true;
  }
  alert(
    `Some of your selected tokens have not been added to the tracked tokens list. Please go to the Balances tab and add these tokens.`
  );
  return false;
};

const checkAllowance = async (b0x, accounts, tokenAddress) => {
  const allowance = await b0x.getAllowance({
    tokenAddress,
    ownerAddress: accounts[0].toLowerCase()
  });
  return allowance.toNumber() !== 0;
};

const checkCoinsApproved = async (b0x, accounts, state) => {
  const {
    loanTokenAddress,
    interestTokenAddress,
    collateralTokenAddress,
    role
  } = state;
  if (role === `lender`) {
    const a = await checkAllowance(b0x, accounts, loanTokenAddress);
    const b = await checkAllowance(b0x, accounts, interestTokenAddress);
    return a && b;
  }
  const a = await checkAllowance(b0x, accounts, loanTokenAddress);
  const b = await checkAllowance(b0x, accounts, interestTokenAddress);
  const c = await checkAllowance(b0x, accounts, collateralTokenAddress);
  return a && b && c;
};

export default async (b0x, accounts, state, tokens) => {
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

  const coinsAdded = checkCoinsAdded(state, tokens);
  if (!coinsAdded) {
    return false;
  }

  const coinsApproved = await checkCoinsApproved(b0x, accounts, state);
  if (!coinsApproved) {
    alert(
      `Some of your selected tokens have not been approved. Please go to the Balances tab and approve these tokens.`
    );
    return false;
  }
  return true;
};
