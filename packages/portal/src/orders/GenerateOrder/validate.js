import { getTrackedTokens } from "../../common/trackedTokens";
import { getTokenBalance, getSymbol, getDecimals } from "../../common/tokens";
import { toBigNumber } from "../../common/utils";

const validRange = (min, max, val) => {
  if (val <= max && val >= min) {
    return true;
  }
  throw new Error(`Invalid range`);
};

const checkCoinsAdded = ({ loanTokenAddress, interestTokenAddress, collateralTokenAddress, role }, tokens) => {
  return true;
  /*const trackedTokens = getTrackedTokens(tokens);

  if (role === `lender`) {
    return trackedTokens.includes(loanTokenAddress);
  }
  const a = trackedTokens.includes(interestTokenAddress);
  const b = trackedTokens.includes(collateralTokenAddress);
  return a && b;*/
};

const checkAllowance = async (bZx, accounts, tokenAddress) => {
  const allowance = await bZx.getAllowance({
    tokenAddress,
    ownerAddress: accounts[0].toLowerCase()
  });
  return allowance.toNumber() !== 0;
};

const silentAllowance = async (bZx, accounts, tokenAddress) => {
    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.setAllowanceUnlimited({
      tokenAddress: tokenAddress,
      ownerAddress: accounts[0].toLowerCase(),
      getObject: true,
      txOpts
    });

    try {
      let gas = await txObj.estimateGas(txOpts);
      console.log(gas);
      txOpts.gas = window.gasValue(gas);
      await txObj.send(txOpts);
      return true;
	} catch (error) {
      console.error(error.message);
      return false;
    }
}

// TODO: Verify sufficient BZRX token balance to pay fees
const checkRelaysFees = async (
  bZx,
  accounts,
  tokens,
  state
) => {
  const { role, feeRecipientAddress, traderRelayFee, lenderRelayFee } = state;
  if (feeRecipientAddress === `0x0000000000000000000000000000000000000000`) {
    return true;
  }
  const feeToken = tokens.filter(
    t => t.symbol === `BZRX`
  )[0];
  if ((role === `trader` && traderRelayFee !== `0`) || (role === `lender` && lenderRelayFee !== `0`)) {
    const a = await checkAllowance(bZx, accounts, feeToken.address);
    if (!a) {
      return (await silentAllowance(bZx, accounts, feeToken.address));
    } else {
      return true;
    }
  }
}

const checkCoinsApproved = async (bZx, accounts, state) => {
  const { loanTokenAddress, interestTokenAddress, collateralTokenAddress, role } = state;
  if (role === `lender`) {
    const loanTokenAllowed = await checkAllowance(bZx, accounts, loanTokenAddress);
    if (!loanTokenAllowed) {
      return (await silentAllowance(bZx, accounts, loanTokenAddress));
    } else {
      return true;
    }
  } else {
    let a = await checkAllowance(bZx, accounts, interestTokenAddress);
    if (!a) {
      a = await silentAllowance(bZx, accounts, interestTokenAddress);
    }

    let b = await checkAllowance(bZx, accounts, collateralTokenAddress);
    if (!b) {
      b = await silentAllowance(bZx, accounts, collateralTokenAddress);
    }

    return a && b;
  }
};

const checkCoinsAllowed = (state, tokens, networkId) => {
  const { loanTokenAddress, collateralTokenAddress, role } = state;
  const notAllowed = {
    1: [`BZRX`, `BZRXFAKE`],
    3: [`BZRX`, `BZRXFAKE`],
    4: [`BZRX`],
    42: [`BZRX`],
    50: [`BZRX`]
  };

  // early return if there is no restricted list for this network
  if (notAllowed[networkId] === undefined || notAllowed[networkId] === []) return true;

  const loanToken = tokens.filter(t => t.address === loanTokenAddress)[0];
  const invalidLoanToken = notAllowed[networkId].includes(loanToken && loanToken.symbol);

  if (role === `lender`) {
    return !invalidLoanToken;
  }

  // for trader, check collateral token as well
  const collateralToken = tokens.filter(t => t.address === collateralTokenAddress)[0];

  const invalidCollateralToken = notAllowed[networkId].includes(collateralToken && collateralToken.symbol);

  const invalid = invalidLoanToken || invalidCollateralToken;
  return !invalid;
};

export default async (bZx, accounts, state, tokens, web3) => {
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
    maintenanceMarginAmount,
    feeRecipientAddress,
    takerAddress
  } = state;
  if (loanTokenAmount === `` || interestAmount === ``) {
    alert(`Please enter a valid token amount.`);
    return false;
  }

  if (!web3.utils.isAddress(feeRecipientAddress)) {
    alert(`Please enter a valid Relay/Exchange Address.`);
    return false;
  }

  if (!web3.utils.isAddress(takerAddress)) {
    alert(`Please enter a valid taker address.`);
    return false;
  }

  try {
    validRange(25000000000000000000, 100000000000000000000, initialMarginAmount);
    validRange(15000000000000000000, 90000000000000000000, maintenanceMarginAmount);
    if (maintenanceMarginAmount > initialMarginAmount) {
      throw Error(`The maintenance margin amount cannot be larger than initial margin amount.`);
    }
  } catch (error) {
    // eslint-disable-next-line no-undef
    alert(`Margin amounts are invalid: ${error.message}`);
    return false;
  }

  const coinsAllowed = checkCoinsAllowed(state, tokens, bZx.networkId);
  if (!coinsAllowed) {
    alert(
      // `The selected tokens are not yet supported for lending or collateral.`
      `Token BZRX is not yet supported for lending or collateral. It can be used to pay interest.`
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

  const coinsApproved = await checkCoinsApproved(bZx, accounts, state);
  if (!coinsApproved) {
    alert(
      `Some of your selected tokens have not been approved. Please go to the Balances page and approve these tokens.`
    );
    return false;
  }

  /*const relayFeesOk = await checkRelaysFees(bZx, accounts, tokens, state);
  if (!relayFeesOk) {
    alert(
      `Please ensure you have enough BZRX to pay relay fees.`
    );
    return false;
  }*/

  if (role === `trader`) {
    const interestTokenBalance = await getTokenBalance(bZx, interestTokenAddress, accounts);
    if (toBigNumber(interestTotalAmount, 10 ** getDecimals(tokens, interestTokenAddress)).gt(interestTokenBalance)) {
      alert(
        `Your interest token balance is too low. You need at least ${interestTotalAmount} ${getSymbol(
          tokens,
          interestTokenAddress
        )} create this order.`
      );
      return false;
    }

    const collateralTokenBalance = await getTokenBalance(bZx, collateralTokenAddress, accounts);
    if (
      toBigNumber(collateralTokenAmount, 10 ** getDecimals(tokens, collateralTokenAddress)).gt(collateralTokenBalance)
    ) {
      alert(
        `Your collteral token balance is too low. You need at least ${collateralTokenAmount} ${getSymbol(
          tokens,
          collateralTokenAddress
        )} create this order.`
      );
      return false;
    }
  } else {
    const loanTokenBalance = await getTokenBalance(bZx, loanTokenAddress, accounts);
    if (toBigNumber(loanTokenAmount, 10 ** getDecimals(tokens, loanTokenAddress)).gt(loanTokenBalance)) {
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
