import { clone } from "ramda";
import { constants as constantsZX } from "@0xproject/order-utils/lib/src/constants";
import { local as Contracts } from "../../contracts";
import bZxJS from "../../core/__tests__/setup";
import BZxJS from "../../core/index";
import * as utils from "../../core/utils";
import Accounts from "../../core/__tests__/accounts";
import * as UnlockUtils from "../../core/__tests__/unlock";
import makeOrder from "../../core/__tests__/order";
import * as orderConstants from "../../core/constants/order";

export const getContractInstances = contracts =>
  contracts.map(contract =>
    utils.getContractInstance(bZxJS.web3, contract.abi, contract.address)
  );

export const unlockAllAccounts = () => {
  const promises = Accounts.map(account =>
    UnlockUtils.unlock(bZxJS.web3, account)
  );
  return Promise.all(promises);
};

export const initAllContractInstances = () => {
  const loanTokenContracts = [Contracts.TestToken0, Contracts.TestToken1];
  const collateralTokenContracts = [Contracts.TestToken2, Contracts.TestToken3];
  const interestTokenContracts = [Contracts.TestToken4, Contracts.TestToken5];

  const loanTokens = getContractInstances(loanTokenContracts);
  const collateralTokens = getContractInstances(collateralTokenContracts);
  const interestTokens = getContractInstances(interestTokenContracts);

  const bZxToken = utils.getContractInstance(
    bZxJS.web3,
    Contracts.BZxToken.abi,
    Contracts.BZxToken.address
  );

  return { loanTokens, collateralTokens, interestTokens, bZxToken };
};

export const setupBZxToken = async ({
  bZxToken,
  lenders,
  traders,
  transferAmount,
  ownerTxOpts
}) => {
  const allAddresses = [...lenders, ...traders];

  const bZxTokenPromises = allAddresses.map(address =>
    bZxToken.methods.transfer(address, transferAmount).send(clone(ownerTxOpts))
  );
  const allowancePromises = allAddresses.map(address =>
    bZxJS.setAllowanceUnlimited({
      tokenAddress: Contracts.BZxToken.address,
      ownerAddress: address,
      spenderAddress: Contracts.BZxVault.address
    })
  );

  const promises = [...bZxTokenPromises, ...allowancePromises];
  await Promise.all(promises);
};

export const setupLoanTokens = async ({
  loanTokens,
  lenders,
  transferAmount,
  ownerTxOpts
}) => {
  const promises = [
    loanTokens[0].methods
      .transfer(lenders[0], transferAmount)
      .send(clone(ownerTxOpts)),
    loanTokens[1].methods
      .transfer(lenders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[0].options.address.toLowerCase(),
      ownerAddress: lenders[0],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[1].options.address.toLowerCase(),
      ownerAddress: lenders[1],
      spenderAddress: Contracts.BZxVault.address
    })
  ];

  await Promise.all(promises);
};

export const setupCollateralTokens = async ({
  collateralTokens,
  traders,
  transferAmount,
  ownerTxOpts
}) => {
  const promises = [
    collateralTokens[0].methods
      .transfer(traders[0], transferAmount)
      .send(clone(ownerTxOpts)),
    collateralTokens[1].methods
      .transfer(traders[0], transferAmount)
      .send(clone(ownerTxOpts)),
    collateralTokens[0].methods
      .transfer(traders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    collateralTokens[1].methods
      .transfer(traders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[1].options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[1].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.BZxVault.address
    })
  ];

  await Promise.all(promises);
};

export const setupInterestTokens = async ({
  interestTokens,
  traders,
  transferAmount,
  ownerTxOpts
}) => {
  const promises = [
    interestTokens[0].methods
      .transfer(traders[0], transferAmount)
      .send(clone(ownerTxOpts)),
    interestTokens[0].methods
      .transfer(traders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    interestTokens[1].methods
      .transfer(traders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.BZxVault.address
    }),
    bZxJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[1].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.BZxVault.address
    })
  ];

  await Promise.all(promises);
};

export const makeOrderAsTrader = ({
  web3,
  traders,
  loanTokens,
  interestTokens,
  collateralTokens,
  loanTokenAmount
} = {}) =>
  makeOrder({
    makerAddress: traders[1],
    loanTokenAddress: loanTokens[1].options.address.toLowerCase(),
    interestTokenAddress: interestTokens[1].options.address.toLowerCase(),
    collateralTokenAddress: collateralTokens[1].options.address.toLowerCase(),
    feeRecipientAddress: constantsZX.NULL_ADDRESS,
    loanTokenAmount,
    interestAmount: web3.utils.toWei("2").toString(),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "25",
    lenderRelayFee: web3.utils.toWei("0.001").toString(),
    traderRelayFee: web3.utils.toWei("0.0015").toString(),
    expirationUnixTimestampSec: "2519061340",
    makerRole: orderConstants.MAKER_ROLE.TRADER,
    salt: BZxJS.generatePseudoRandomSalt().toString()
  });

export const makeOrderAsLender = ({
  web3,
  loanTokenAmount = web3.utils.toWei("251").toString(),
  lenders,
  loanTokens,
  interestTokens
} = {}) =>
  makeOrder({
    makerAddress: lenders[0],
    loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
    interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
    collateralTokenAddress: constantsZX.NULL_ADDRESS,
    feeRecipientAddress: constantsZX.NULL_ADDRESS,
    loanTokenAmount,
    interestAmount: web3.utils.toWei("2").toString(),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "25",
    lenderRelayFee: web3.utils.toWei("0.001").toString(),
    traderRelayFee: web3.utils.toWei("0.0015").toString(),
    expirationUnixTimestampSec: "2519061340",
    makerRole: orderConstants.MAKER_ROLE.LENDER,
    salt: BZxJS.generatePseudoRandomSalt().toString()
  });

export const getAccounts = () => ({
  owner: Accounts[0].address,
  lenders: [Accounts[1].address, Accounts[3].address],
  traders: [Accounts[2].address, Accounts[4].address]
});

export const setupAll = async ({ owner, lenders, traders, transferAmount }) => {
  const {
    loanTokens,
    collateralTokens,
    interestTokens,
    bZxToken
  } = initAllContractInstances();

  const ownerTxOpts = { from: owner };

  await setupBZxToken({
    bZxToken,
    lenders,
    traders,
    transferAmount,
    ownerTxOpts
  });
  await setupLoanTokens({
    loanTokens,
    lenders,
    transferAmount,
    ownerTxOpts
  });
  await setupCollateralTokens({
    collateralTokens,
    traders,
    transferAmount,
    ownerTxOpts
  });
  await setupInterestTokens({
    interestTokens,
    traders,
    transferAmount,
    ownerTxOpts
  });
};
