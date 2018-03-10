import Contracts from "../../src/contracts";
import b0xJS from "../setup";
import * as utils from "../../src/utils";

export const getContractInstances = contracts => {
  const promises = contracts.map(contract =>
    utils.getContractInstance(b0xJS.web3, contract.abi, contract.address)
  );
  return Promise.all(promises);
};

export const initAllContractInstances = async () => {
  const loanTokenContracts = [Contracts.TestToken0, Contracts.TestToken1];
  const collateralTokenContracts = [Contracts.TestToken2, Contracts.TestToken3];
  const interestTokenContracts = [Contracts.TestToken4, Contracts.TestToken5];

  const loanTokens = await getContractInstances(loanTokenContracts);
  const collateralTokens = await getContractInstances(collateralTokenContracts);
  const interestTokens = await getContractInstances(interestTokenContracts);

  const b0xToken = await utils.getContractInstance(
    b0xJS.web3,
    Contracts.B0xToken.abi,
    Contracts.B0xToken.address
  );
  return { loanTokens, collateralTokens, interestTokens, b0xToken };
};

export const setupB0xToken = ({
  b0xToken,
  lenders,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    b0xToken.methods.transfer(lenders[0], transferAmt).send(ownerTxOpts),
    b0xToken.methods.transfer(lenders[1], transferAmt).send(ownerTxOpts),
    b0xToken.methods.transfer(traders[0], transferAmt).send(ownerTxOpts),
    b0xToken.methods.transfer(traders[1], transferAmt).send(ownerTxOpts),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: Contracts.B0xToken.address,
      ownerAddress: lenders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: Contracts.B0xToken.address,
      ownerAddress: lenders[1],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: Contracts.B0xToken.address,
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: Contracts.B0xToken.address,
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];
  return Promise.all(promises);
};

export const setupLoanTokens = ({
  loanTokens,
  lenders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    loanTokens[0].methods.transfer(lenders[0], transferAmt).send(ownerTxOpts),
    loanTokens[1].methods.transfer(lenders[1], transferAmt).send(ownerTxOpts),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[0].options.address.toLowerCase(),
      ownerAddress: lenders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[1].options.address.toLowerCase(),
      ownerAddress: lenders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};

export const setupCollateralTokens = ({
  collateralTokens,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    collateralTokens[0].methods
      .transfer(traders[0], transferAmt)
      .send(ownerTxOpts),
    collateralTokens[1].methods
      .transfer(traders[1], transferAmt)
      .send(ownerTxOpts),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[1].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};

export const setupInterestTokens = ({
  interestTokens,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    interestTokens[0].methods
      .transfer(traders[0], transferAmt)
      .send(ownerTxOpts),
    interestTokens[1].methods
      .transfer(traders[1], transferAmt)
      .send(ownerTxOpts),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[0].options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[1].options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};
