import moment from "moment";

import styled from "styled-components";
import BZxJS from "b0x.js";  // eslint-disable-line
import { getTrackedTokens } from "../../common/trackedTokens";
import { getTokenBalance, getSymbol } from "../../common/tokens";
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
    const a = await checkAllowance(bZx, accounts, interestTokenAddress);
    const b = await checkAllowance(bZx, accounts, collateralTokenAddress);
    return a && b;
  }
  // check that user has approved loanToken
  const { loanTokenAddress } = order;
  const a = await checkAllowance(bZx, accounts, loanTokenAddress);
  return a;
};

const getNetwork = networkId => {
  if (!networkId) {
    throw new Error(`networkId missed!`);
  }

  let networkName;
  switch (networkId) {
    case 1: {
      networkName = `Main net`;
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
        totalInterest = (exp - now) / 86400 * order.interestAmount;
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

    if (order.expirationUnixTimestampSec <= moment().unix()) {
      alert(`This order has expired. It can no longer be filled.`);
      return false;
    }

    const oracle = oracles.filter(o => o.address === order.oracleAddress)[0];
    if (!oracle) {
      alert(
        `The oracle of this order is no longer active. Please try a different order.`
      );
      return false;
    }

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

      // TODO: Chcek for partial fills!
      if (toBigNumber(fillOrderAmount, 1e18).gt(loanTokenAvailable)) {
        alert(
          `You can't borrow more than ${fromBigNumber(
            loanTokenAvailable,
            1e18
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
        1: [`ZRX`, `BZRXFAKE`],
        3: [`ZRX`, `BZRX`],
        4: [],
        42: [`ZRX`, `WETH`]
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
      if (
        !trackedTokens.includes(interestTokenAddress) ||
        !trackedTokens.includes(collateralTokenAddress)
      ) {
        alert(
          `Your interest token or collateral token is not tracked. Please go to the Balances page and add these tokens.`
        );
        return false;
      }

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
      if (toBigNumber(collateralTokenAmount, 1e18).gt(collateralTokenBalance)) {
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
            1e18
          )} ${getSymbol(tokens, interestTokenAddress)} to fill this order.`
        );
        return false;
      }
    } else {
      // check that user has tracked loanToken
      const { loanTokenAddress, loanTokenAmount } = order;
      if (!trackedTokens.includes(loanTokenAddress)) {
        alert(
          `Your loan token is not tracked. Please go to the Balances page and add this token.`
        );
        return false;
      }

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
            1e18
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

export const submitFillOrder = (
  order,
  loanTokenAmountFilled,
  collateralTokenAddress,
  web3,
  bZx,
  accounts
) => {
  const txOpts = {
    from: accounts[0],
    // gas: 1000000, // gas estimated in b0x.js
    gasPrice: web3.utils.toWei(`1`, `gwei`).toString()
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
    txObj = bZx.takeLoanOrderAsTrader({
      order,
      collateralTokenAddress,
      loanTokenAmountFilled: toBigNumber(loanTokenAmountFilled, 1e18),
      getObject: true
    });
  } else {
    txObj = bZx.takeLoanOrderAsLender({
      order,
      getObject: true
    });
  }

  try {
    txObj
      .estimateGas(txOpts)
      .then(gas => {
        console.log(gas);
        txOpts.gas = gas;
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
            alert(`Your loan has been opened.`);
          })
          .catch(error => {
            console.error(error.message);
            if (
              error.message.includes(`Condition of use not satisfied`) ||
              error.message.includes(`Invalid status`)
            ) {
              alert();
            }
          });
      })
      .catch(error => {
        console.error(error);
        alert(
          `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
        );
      });
  } catch (error) {
    console.error(error);
    alert(
      `The transaction is failing. This loan cannot be opened at this time. Please check the parameters of the order.`
    );
  }

  return true;
};
