import { getTrackedTokens } from "../../common/trackedTokens";
import { getTokenBalance, getSymbol } from "../../common/tokens";
import { toBigNumber } from "../../common/utils";

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

  if (role === `lender`) {
    return trackedTokens.includes(loanTokenAddress);
  }
  const a = trackedTokens.includes(interestTokenAddress);
  const b = trackedTokens.includes(collateralTokenAddress);
  return a && b;
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
    const loanTokenAllowed = await checkAllowance(
      b0x,
      accounts,
      loanTokenAddress
    );
    return loanTokenAllowed;
  }
  const a = await checkAllowance(b0x, accounts, interestTokenAddress);
  const b = await checkAllowance(b0x, accounts, collateralTokenAddress);
  return a && b;
};

const checkCoinsAllowed = (state, tokens, networkId) => {
  const { loanTokenAddress, collateralTokenAddress, role } = state;
  const notAllowed = {
    1: [],
    3: [`ZRX`, `B0X`],
    4: [],
    42: [`ZRX`, `WETH`]
  };

  // early return if there is no restricted list for this network
  if (notAllowed[networkId] === undefined || notAllowed[networkId] === [])
    return true;

  const loanToken = tokens.filter(t => t.address === loanTokenAddress)[0];
  const invalidLoanToken = notAllowed[networkId].includes(
    loanToken && loanToken.symbol
  );

  if (role === `lender`) {
    return !invalidLoanToken;
  }

  // for trader, check collateral token as well
  const collateralToken = tokens.filter(
    t => t.address === collateralTokenAddress
  )[0];

  const invalidCollateralToken = notAllowed[networkId].includes(
    collateralToken && collateralToken.symbol
  );

  const invalid = invalidLoanToken || invalidCollateralToken;
  return !invalid;
};

export default async (b0x, accounts, state, tokens) => {
  const {
    role,
    loanTokenAddress,
    interestTokenAddress,
    collateralTokenAddress,
    loanTokenAmount,
    interestTotalAmount,
    collateralTokenAmount,
    interestAmount,
    initialMarginAmount,
    maintenanceMarginAmount
  } = state;
  if (loanTokenAmount === `` || interestAmount === ``) {
    alert(`Please enter a valid token amount.`);
    return false;
  }

  try {
    validRange(40, 100, initialMarginAmount);
    validRange(20, 90, maintenanceMarginAmount);
    if (maintenanceMarginAmount > initialMarginAmount) {
      throw Error(
        `The maintenance margin amount cannot be larger than initial margin amount.`
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-undef
    alert(`Margin amounts are invalid: ${error.message}`);
    return false;
  }

  const coinsAllowed = checkCoinsAllowed(state, tokens, b0x.networkId);
  if (!coinsAllowed) {
    alert(
      `The selected tokens are not yet supported for lending or collateral.`
    );
    return false;
  }

  const coinsAdded = checkCoinsAdded(state, tokens);
  if (!coinsAdded) {
    alert(
      `Some of your selected tokens have not been added to the tracked tokens list. Please go to the Balances page and add these tokens.`
    );
    return false;
  }

  const coinsApproved = await checkCoinsApproved(b0x, accounts, state);
  if (!coinsApproved) {
    alert(
      `Some of your selected tokens have not been approved. Please go to the Balances page and approve these tokens.`
    );
    return false;
  }

  if (role === `trader`) {
    const interestTokenBalance = await getTokenBalance(
      b0x,
      interestTokenAddress,
      accounts
    );
    if (toBigNumber(interestTotalAmount, 1e18).gt(interestTokenBalance)) {
      alert(
        `Your interest token balance is too low. You need at least ${interestTotalAmount} ${getSymbol(
          tokens,
          interestTokenAddress
        )} create this order.`
      );
      return false;
    }

    const collateralTokenBalance = await getTokenBalance(
      b0x,
      collateralTokenAddress,
      accounts
    );
    if (toBigNumber(collateralTokenAmount, 1e18).gt(collateralTokenBalance)) {
      alert(
        `Your collteral token balance is too low. You need at least ${collateralTokenAmount} ${getSymbol(
          tokens,
          collateralTokenAddress
        )} create this order.`
      );
      return false;
    }
  } else {
    const loanTokenBalance = await getTokenBalance(
      b0x,
      loanTokenAddress,
      accounts
    );
    if (toBigNumber(loanTokenAmount, 1e18).gt(loanTokenBalance)) {
      alert(
        `Your loan token balance is too low. You need at least ${loanTokenAmount} ${getSymbol(
          tokens,
          loanTokenAddress
        )} create this order.`
      );
      return false;
    }
  }

  return true;
};
