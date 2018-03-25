import { clone } from "ramda";
import Contracts from "../../contracts";
import b0xJS from "../../../test/setup";
import * as utils from "../../utils";
import Accounts from "../../../test/constants/accounts";
import * as UnlockUtils from "../../../test/utils/unlock";

export const getContractInstances = contracts => {
  const promises = contracts.map(contract =>
    utils.getContractInstance(b0xJS.web3, contract.abi, contract.address)
  );
  return Promise.all(promises);
};

export const unlockAllAccounts = () => {
  const promises = Accounts.map(account =>
    UnlockUtils.unlock(b0xJS.web3, account)
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

  console.log("initAllContractInstances done.");
  return { loanTokens, collateralTokens, interestTokens, b0xToken };
};

export const setupB0xToken = async ({
  b0xToken,
  lenders,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    b0xToken.methods.transfer(lenders[0], transferAmt).send(clone(ownerTxOpts)),
    b0xToken.methods.transfer(lenders[1], transferAmt).send(clone(ownerTxOpts)),
    b0xToken.methods.transfer(traders[0], transferAmt).send(clone(ownerTxOpts)),
    b0xToken.methods.transfer(traders[1], transferAmt).send(clone(ownerTxOpts)),
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
  await Promise.all(promises);
  console.log("setupB0xToken done.");

  const balancePs = [...lenders, ...traders].map(address =>
    b0xJS.getBalance({
      tokenAddress: b0xToken.options.address.toLowerCase(),
      ownerAddress: address
    })
  );
  const balances = await Promise.all(balancePs);
  const addresses = ["lender0", "lender1", "trader0", "trader1"];
  addresses.map((address, i) => console.log(address, balances[i].toString()));
};

export const setupLoanTokens = async ({
  loanTokens,
  lenders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    loanTokens[0].methods
      .transfer(lenders[0], transferAmt)
      .send(clone(ownerTxOpts)),
    loanTokens[1].methods
      .transfer(lenders[1], transferAmt)
      .send(clone(ownerTxOpts)),
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

  await Promise.all(promises);
  console.log("setupLoanTokens done.");

  const lender0Balance = await b0xJS.getBalance({
    tokenAddress: loanTokens[0].options.address.toLowerCase(),
    ownerAddress: lenders[0]
  });
  console.log("loanTokens0", lender0Balance.toString());

  const lender1Balance = await b0xJS.getBalance({
    tokenAddress: loanTokens[1].options.address.toLowerCase(),
    ownerAddress: lenders[1]
  });
  console.log("loanTokens1", lender1Balance.toString());
};

export const setupCollateralTokens = async ({
  collateralTokens,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    collateralTokens[0].methods
      .transfer(traders[0], transferAmt)
      .send(clone(ownerTxOpts)),
    collateralTokens[1].methods
      .transfer(traders[1], transferAmt)
      .send(clone(ownerTxOpts)),
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

  await Promise.all(promises);
  console.log("setupCollateralTokens done.");

  const lender0Balance = await b0xJS.getBalance({
    tokenAddress: collateralTokens[0].options.address.toLowerCase(),
    ownerAddress: traders[0]
  });
  console.log("collateralTokens0", lender0Balance.toString());

  const lender1Balance = await b0xJS.getBalance({
    tokenAddress: collateralTokens[1].options.address.toLowerCase(),
    ownerAddress: traders[1]
  });
  console.log("collateralTokens1", lender1Balance.toString());
};

export const setupInterestTokens = async ({
  interestTokens,
  traders,
  transferAmt,
  ownerTxOpts
}) => {
  const promises = [
    interestTokens[0].methods
      .transfer(traders[0], transferAmt)
      .send(clone(ownerTxOpts)),
    interestTokens[1].methods
      .transfer(traders[1], transferAmt)
      .send(clone(ownerTxOpts)),
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

  await Promise.all(promises);
  console.log("setupInterestTokens done.");
};
