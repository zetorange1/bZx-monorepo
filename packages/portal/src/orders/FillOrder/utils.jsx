import moment from "moment";

import styled from "styled-components";
import { BZxJS } from "bzx.js"; // eslint-disable-line
import { getTrackedTokens } from "../../common/trackedTokens";
import { getTokenBalance, getSymbol, getDecimals } from "../../common/tokens";
import { toBigNumber, fromBigNumber } from "../../common/utils";

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
}
`;

export const getOrderHash = order => BZxJS.getLoanOrderHashHex(order);

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
  order
) => {
  if (order.feeRecipientAddress === `0x0000000000000000000000000000000000000000`) {
    return true;
  }
  const makerRole = order.makerRole === `0` ? `lender` : `trader`;
  const feeToken = tokens.filter(
    t => t.symbol === `BZRX`
  )[0];
  if ((makerRole === `lender` && order.traderRelayFee !== `0`) || (makerRole === `trader` && order.lenderRelayFee !== `0`)) {
    const a = await checkAllowance(bZx, accounts, feeToken.address);
    if (!a) {
      return (await silentAllowance(bZx, accounts, feeToken.address));
    } else {
      return true;
    }
  }
}

const checkCoinsApproved = async (
  bZx,
  accounts,
  order,
  collateralTokenAddress
) => {
  const makerRole = order.makerRole === `0` ? `lender` : `trader`;
  if (makerRole === `lender`) {
    // check that user has approved collateralToken and interestToken
    const { interestTokenAddress } = order;

    let a = await checkAllowance(bZx, accounts, interestTokenAddress);
    if (!a) {
      a = await silentAllowance(bZx, accounts, interestTokenAddress);
    }

    let b = await checkAllowance(bZx, accounts, collateralTokenAddress);
    if (!b) {
      b = await silentAllowance(bZx, accounts, collateralTokenAddress);
    }

    return a && b;
  } else {
    // check that user has approved loanToken
    const { loanTokenAddress } = order;
    const a = await checkAllowance(bZx, accounts, loanTokenAddress);
    if (!a) {
      return (await silentAllowance(bZx, accounts, loanTokenAddress));
    } else {
      return true;
    }
  }
};

const getNetwork = networkId => {
  if (!networkId) {
    throw new Error(`networkId missed!`);
  }

  let networkName;
  switch (networkId) {
    case 1: {
      networkName = `Mainnet`;
      break;
    }
    case 3: {
      networkName = `Ropsten Testnet`;
      break;
    }
    case 4: {
      networkName = `Rinkeby Testnet`;
      break;
    }
    case 42: {
      networkName = `Kovan Testnet`;
      break;
    }
    default: {
      networkName = `a network with id ${networkId}`;
      break;
    }
  }
  return networkName;
};

const getTotalInterest = order => {
  let totalInterest = 0;
  try {
    if (order.interestAmount && order.expirationUnixTimestampSec) {
      const exp = order.expirationUnixTimestampSec;
      const now = moment().unix();
      if (exp > now) {
        totalInterest = ((exp - now) / 86400) * order.interestAmount;
      }
    }
  } catch (e) {} // eslint-disable-line no-empty
  return totalInterest;
};

export const validateFillOrder = async (
  order,
  fillOrderAmount,
  loanTokenAvailable,
  collateralTokenAddress,
  collateralTokenAmount,
  tokens,
  oracles,
  bZx,
  accounts
) => {
  try {
    if (order.networkId !== bZx.networkId) {
      alert(
        `This order was created for ${getNetwork(
          order.networkId
        )}. It can only be filled on that network.`
      );
      return false;
    }
    if (order.makerAddress.toLowerCase() === accounts[0].toLowerCase()) {
      alert(`This is an order you created, so you can't fill it.`);
      return false;
    }
    
    if (order.takerAddress !== `0x0000000000000000000000000000000000000000` && order.takerAddress.toLowerCase() !== accounts[0].toLowerCase()) {
      alert(`You are not the designated taker of this order, so you can't fill it.`);
      return false;
    }

    if (order.expirationUnixTimestampSec > 0 && order.expirationUnixTimestampSec <= moment().unix()) {
      alert(`This order has expired. It can no longer be filled.`);
      return false;
    }

    /*const oracle = oracles.filter(o => o.address === order.oracleAddress)[0];
    if (!oracle) {
      alert(
        `The oracle of this order is no longer active. Please try a different order.`
      );
      return false;
    }*/

    const makerRole = order.makerRole === `0` ? `lender` : `trader`;
    const trackedTokens = getTrackedTokens(tokens);
    if (makerRole === `lender`) {
      loanTokenAvailable = toBigNumber(loanTokenAvailable); // eslint-disable-line no-param-reassign
      fillOrderAmount = toBigNumber(fillOrderAmount); // eslint-disable-line no-param-reassign

      if (!loanTokenAvailable) {
        alert(
          `This order is completely filled. There is no loan token remaining.`
        );
        return false;
      }

      if (!fillOrderAmount) {
        alert(`Please enter the amount of loan token you want to borrow.`);
        return false;
      }

      const loanTokenMultiplier =
        10 ** getDecimals(tokens, order.loanTokenAddress);
      if (
        toBigNumber(fillOrderAmount, loanTokenMultiplier).gt(loanTokenAvailable)
      ) {
        alert(
          `You can't borrow more than ${fromBigNumber(
            loanTokenAvailable,
            loanTokenMultiplier
          )} ${getSymbol(
            tokens,
            order.loanTokenAddress
          )}. Please enter a lessor amount.`
        );
        return false;
      }

      // make sure the collateral token chosen is allowed
      const collateralToken = tokens.filter(
        t => t.address === collateralTokenAddress
      )[0];
      const notAllowed = {
        1: [`BZRX`, `BZRXFAKE`],
        3: [`BZRX`, `BZRXFAKE`],
        4: [`BZRX`],
        42: [`BZRX`],
        50: [`BZRX`]
      };

      // early return if there is no restricted list for this network
      if (
        notAllowed[bZx.networkId] === undefined ||
        notAllowed[bZx.networkId] === []
      )
        return true;

      const collateralTokenNotAllowed = notAllowed[bZx.networkId].includes(
        collateralToken && collateralToken.symbol
      );
      if (collateralTokenNotAllowed) {
        alert(
          `Token ${collateralToken.symbol} is not yet supported as collateral.`
        );
        return false;
      }

      // check that user has tracked collateralToken and interestToken
      const { interestTokenAddress } = order;
      /*if (
        !trackedTokens.includes(interestTokenAddress) ||
        !trackedTokens.includes(collateralTokenAddress)
      ) {
        alert(
          `Your interest token or collateral token is not tracked. Please go to the Balances page to make sure these tokens are added and approved.`
        );
        return false;
      }*/

      const collateralTokenBalance = await getTokenBalance(
        bZx,
        collateralTokenAddress,
        accounts
      );
      // console.log("collateralTokenAmount: "+collateralTokenAmount);
      // console.log("collateralTokenBalance: "+collateralTokenBalance);
      if (Number.isNaN(collateralTokenAmount)) {
        alert(
          `We are unable to calculate your required collateral at this time. Please try again later to fill this order.`
        );
        return false;
      }

      if (
        toBigNumber(
          collateralTokenAmount,
          10 ** getDecimals(tokens, collateralTokenAddress)
        ).gt(collateralTokenBalance)
      ) {
        alert(
          `Your collateral token balance is too low. You need at least ${collateralTokenAmount} ${getSymbol(
            tokens,
            collateralTokenAddress
          )} to fill this order.`
        );
        return false;
      }

      const interestTokenBalance = await getTokenBalance(
        bZx,
        interestTokenAddress,
        accounts
      );
      const interestTotalAmount = getTotalInterest(order);
      // console.log("interestTotalAmount: "+interestTotalAmount);
      // console.log("interestTokenBalance: "+interestTokenBalance);
      if (toBigNumber(interestTotalAmount).gt(interestTokenBalance)) {
        alert(
          `Your interest token balance is too low. You need at least ${fromBigNumber(
            interestTotalAmount,
            10 ** getDecimals(tokens, interestTokenAddress)
          )} ${getSymbol(tokens, interestTokenAddress)} to fill this order.`
        );
        return false;
      }
    } else {
      // check that user has tracked loanToken
      const { loanTokenAddress, loanTokenAmount } = order;
      /*if (!trackedTokens.includes(loanTokenAddress)) {
        alert(
          `Your loan token is not tracked. Please go to the Balances page to make sure this token is added and approved.`
        );
        return false;
      }*/

      const loanTokenBalance = await getTokenBalance(
        bZx,
        loanTokenAddress,
        accounts
      );
      // console.log("loanTokenAmount: "+loanTokenAmount);
      // console.log("loanTokenBalance: "+loanTokenBalance);
      if (toBigNumber(loanTokenAmount).gt(loanTokenBalance)) {
        alert(
          `Your loan token balance is too low. You need at least ${fromBigNumber(
            loanTokenAmount,
            10 ** getDecimals(tokens, loanTokenAddress)
          )} ${getSymbol(tokens, loanTokenAddress)} to fill this order.`
        );
        return false;
      }
    }

    const coinsApproved = await checkCoinsApproved(
      bZx,
      accounts,
      order,
      collateralTokenAddress
    );
    if (!coinsApproved) {
      alert(
        `Some of your tokens are not approved. Please go to the Balances page and approve these tokens.`
      );
      return false;
    }

    const relayFeesOk = await checkRelaysFees(bZx, accounts, tokens, order);
    if (!relayFeesOk) {
      alert(
        `Please ensure you have enough BZRX to pay relay fees.`
      );
      return false;
    }

    console.log(`validateFillOrder`);
    console.log(order, fillOrderAmount, collateralTokenAddress);
    return true;
  } catch (e) {
    console.error(e);
    alert(
      `The JSON order has one or more invalid or missing parameters. It can't be filled.`
    );
    return false;
  }
};

export const validateCancelOrder = async (
  order,
  cancelOrderAmount,
  loanTokenAvailable,
  tokens,
  bZx,
  accounts
) => {
  try {
    if (order.networkId !== bZx.networkId) {
      alert(
        `This order was created for ${getNetwork(
          order.networkId
        )}. It can only be filled on that network.`
      );
      return false;
    }
    if (order.makerAddress.toLowerCase() !== accounts[0].toLowerCase()) {
      alert(`This is not an order you created, so you can't cancel it.`);
      return false;
    }

    loanTokenAvailable = toBigNumber(loanTokenAvailable); // eslint-disable-line no-param-reassign
    cancelOrderAmount = toBigNumber(cancelOrderAmount); // eslint-disable-line no-param-reassign

    if (!loanTokenAvailable) {
      alert(
        `This order is completely filled. There is no loan token remaining to cancel.`
      );
      return false;
    }

    if (!cancelOrderAmount) {
      alert(
        `Please enter the amount of loan token you want to cancel for this order.`
      );
      return false;
    }

    const loanTokenMultiplier =
      10 ** getDecimals(tokens, order.loanTokenAddress);
    if (
      toBigNumber(cancelOrderAmount, loanTokenMultiplier).gt(loanTokenAvailable)
    ) {
      alert(
        `You can't cancel more than ${fromBigNumber(
          loanTokenAvailable,
          loanTokenMultiplier
        )} ${getSymbol(
          tokens,
          order.loanTokenAddress
        )}. Please enter a lessor amount.`
      );
      return false;
    }

    console.log(`validateCancelOrder`);
    //console.log(order, cancelOrderAmount);
    return true;
  } catch (e) {
    console.error(e);
    alert(
      `The JSON order has one or more invalid or missing parameters. It can't be filled.`
    );
    return false;
  }
};

export const submitFillOrder = (
  order,
  loanTokenAmountFilled,
  collateralTokenAddress,
  overCollateralize,
  tokens,
  web3,
  bZx,
  accounts,
  resetOrder
) => {
  const txOpts = {
    from: accounts[0],
    gas: 2000000,
    gasPrice: window.defaultGasPrice.toString()
  };
  const makerIsLender = order.makerRole === `0`;

  // console.log(`order`, order);
  // console.log(`txOpts`, txOpts);
  // console.log(`makerIsLender`, makerIsLender);

  if (bZx.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this transaction on your device.`);
  }

  let txObj;
  if (makerIsLender) {
    if (overCollateralize) {
      txObj = bZx.takeLoanOrderAsTrader({
        order,
        collateralTokenAddress,
        loanTokenAmountFilled: toBigNumber(
          loanTokenAmountFilled,
          10 ** getDecimals(tokens, order.loanTokenAddress)
        ),
        withdrawOnOpen: true,
        getObject: true
      });
    } else {
      txObj = bZx.takeLoanOrderAsTrader({
        order,
        collateralTokenAddress,
        loanTokenAmountFilled: toBigNumber(
          loanTokenAmountFilled,
          10 ** getDecimals(tokens, order.loanTokenAddress)
        ),
        withdrawOnOpen: false,
        getObject: true
      });
    }
  } else {
    txObj = bZx.takeLoanOrderAsLender({
      order,
      getObject: true
    });
  }
  console.log(txOpts);

  try {
    txObj
      .estimateGas(txOpts)
      .then(gas => {
        console.log(gas);
        txOpts.gas = window.gasValue(gas);
        txObj
          .send(txOpts)
          .once(`transactionHash`, hash => {
            alert(`Transaction submitted, transaction hash:`, {
              component: () => (
                <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                  {hash}
                </TxHashLink>
              )
            });
          })
          .then(() => {
            console.log();
            resetOrder();
            alert(`Your loan has been opened.`);
            this.setState({ isSubmitted: false });
          })
          .catch(error => {
            console.error(error.message);
            if (
              error.message.includes(`denied transaction signature`) ||
              error.message.includes(`Condition of use not satisfied`) ||
              error.message.includes(`Invalid status`)
            ) {
              alert();
            }
            this.setState({ isSubmitted: false });
          });
      })
      .catch(error => {
        console.error(error);
        alert(
          `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
        );
        this.setState({ isSubmitted: false });
      });
  } catch (error) {
    console.error(error);
    alert(
      `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
    );
    this.setState({ isSubmitted: false });
  }

  return true;
};

export const submitFillOrderWithHash = (
  loanOrderHash,
  makerIsLender,
  loanTokenAddress,
  loanTokenAmountFilled,
  collateralTokenAddress,
  overCollateralize,
  tokens,
  web3,
  bZx,
  accounts,
  changeTab
) => {
  const txOpts = {
    from: accounts[0],
    // gas: 1000000, // gas estimated in bZx.js
    gasPrice: window.defaultGasPrice.toString()
  };

  // console.log(`loanOrderHash`, loanOrderHash);
  // console.log(`txOpts`, txOpts);
  // console.log(`makerIsLender`, makerIsLender);

  if (bZx.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this transaction on your device.`);
  }

  let txObj;
  if (makerIsLender) {
    if (overCollateralize) {
      txObj = bZx.takeLoanOrderOnChainAsTrader({
        loanOrderHash,
        collateralTokenAddress,
        loanTokenAmountFilled: toBigNumber(
          loanTokenAmountFilled,
          10 ** getDecimals(tokens, loanTokenAddress)
        ),
        withdrawOnOpen: true,
        getObject: true
      });
    } else {
      txObj = bZx.takeLoanOrderOnChainAsTrader({
        loanOrderHash,
        collateralTokenAddress,
        loanTokenAmountFilled: toBigNumber(
          loanTokenAmountFilled,
          10 ** getDecimals(tokens, loanTokenAddress)
        ),
        withdrawOnOpen: false,
        getObject: true
      });
    }
  } else {
    txObj = bZx.takeLoanOrderOnChainAsLender({
      loanOrderHash,
      getObject: true
    });
  }
  console.log(txOpts);

  try {
    txObj
      .estimateGas(txOpts)
      .then(gas => {
        console.log(gas);
        txOpts.gas = window.gasValue(gas);
        txObj
          .send(txOpts)
          .once(`transactionHash`, hash => {
            alert(`Transaction submitted, transaction hash:`, {
              component: () => (
                <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                  {hash}
                </TxHashLink>
              )
            });
          })
          .then(() => {
            console.log();
            changeTab(`Orders_OrderBook`);
            alert(`Your loan has been opened.`);
            this.setState({ isSubmitted: false });
          })
          .catch(error => {
            console.error(error.message);
            if (
              error.message.includes(`denied transaction signature`) ||
              error.message.includes(`Condition of use not satisfied`) ||
              error.message.includes(`Invalid status`)
            ) {
              alert();
            }
            this.setState({ isSubmitted: false });
          });
      })
      .catch(error => {
        console.error(error);
        alert(
          `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
        );
        this.setState({ isSubmitted: false });
      });
  } catch (error) {
    console.error(error);
    alert(
      `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
    );
    this.setState({ isSubmitted: false });
  }

  return true;
};

export const submitCancelOrder = (
  order,
  cancelLoanTokenAmount,
  tokens,
  web3,
  bZx,
  accounts,
  resetOrder
) => {
  const txOpts = {
    from: accounts[0],
    // gas: 1000000, // gas estimated in bZx.js
    gasPrice: window.defaultGasPrice.toString()
  };

  // console.log(`order`, order);
  // console.log(`txOpts`, txOpts);
  // console.log(`makerIsLender`, makerIsLender);

  if (bZx.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this transaction on your device.`);
  }

  const txObj = bZx.cancelLoanOrder({
    order,
    cancelLoanTokenAmount: toBigNumber(
      cancelLoanTokenAmount,
      10 ** getDecimals(tokens, order.loanTokenAddress)
    ),
    getObject: true
  });
  console.log(txOpts);

  try {
    txObj
      .estimateGas(txOpts)
      .then(gas => {
        console.log(gas);
        txOpts.gas = window.gasValue(gas);
        txObj
          .send(txOpts)
          .once(`transactionHash`, hash => {
            alert(`Transaction submitted, transaction hash:`, {
              component: () => (
                <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                  {hash}
                </TxHashLink>
              )
            });
          })
          .then(() => {
            console.log();
            resetOrder();
            alert(`You have canceled all or part of your loan order.`);
            this.setState({ isSubmitted: false });
          })
          .catch(error => {
            console.error(error.message);
            if (
              error.message.includes(`denied transaction signature`) ||
              error.message.includes(`Condition of use not satisfied`) ||
              error.message.includes(`Invalid status`)
            ) {
              alert();
            }
            this.setState({ isSubmitted: false });
          });
      })
      .catch(error => {
        console.error(error);
        alert(
          `The transaction is failing. This loan cannot be canceled at this time. Please check the parameters of the order.`
        );
        this.setState({ isSubmitted: false });
      });
  } catch (error) {
    console.error(error);
    alert(
      `The transaction is failing. This loan cannot be canceled at this time. Please check the parameters of the order.`
    );
    this.setState({ isSubmitted: false });
  }

  return true;
};

export const submitCancelOrderWithHash = (
  loanOrderHash,
  loanTokenAddress,
  cancelLoanTokenAmount,
  tokens,
  web3,
  bZx,
  accounts,
  changeTab
) => {
  const txOpts = {
    from: accounts[0],
    // gas: 1000000, // gas estimated in bZx.js
    gasPrice: window.defaultGasPrice.toString()
  };

  // console.log(`loanOrderHash`, loanOrderHash);
  // console.log(`txOpts`, txOpts);
  // console.log(`makerIsLender`, makerIsLender);

  if (bZx.portalProviderName !== `MetaMask`) {
    alert(`Please confirm this transaction on your device.`);
  }

  const txObj = bZx.cancelLoanOrderWithHash({
    loanOrderHash,
    cancelLoanTokenAmount: toBigNumber(
      cancelLoanTokenAmount,
      10 ** getDecimals(tokens, loanTokenAddress)
    ),
    getObject: true
  });
  console.log(txOpts);

  try {
    txObj
      .estimateGas(txOpts)
      .then(gas => {
        console.log(gas);
        txOpts.gas = window.gasValue(gas);
        txObj
          .send(txOpts)
          .once(`transactionHash`, hash => {
            alert(`Transaction submitted, transaction hash:`, {
              component: () => (
                <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                  {hash}
                </TxHashLink>
              )
            });
          })
          .then(() => {
            console.log();
            changeTab(`Orders_OrderBook`);
            alert(`You have canceled all or part of your loan order.`);
            this.setState({ isSubmitted: false });
          })
          .catch(error => {
            console.error(error.message);
            if (
              error.message.includes(`denied transaction signature`) ||
              error.message.includes(`Condition of use not satisfied`) ||
              error.message.includes(`Invalid status`)
            ) {
              alert();
            }
            this.setState({ isSubmitted: false });
          });
      })
      .catch(error => {
        console.error(error);
        alert(
          `The transaction is failing. This loan cannot be canceled at this time. Please check the parameters of the order.`
        );
        this.setState({ isSubmitted: false });
      });
  } catch (error) {
    console.error(error);
    alert(
      `The transaction is failing. This loan cannot be canceled at this time. Please check the parameters of the order.`
    );
    this.setState({ isSubmitted: false });
  }

  return true;
};
