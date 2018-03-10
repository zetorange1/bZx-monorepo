/* globals test, describe, expect, beforeAll */
import { pathOr } from "ramda";
// import { BigNumber } from "bignumber.js";
import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import B0xJS from "../src";
import b0xJS from "./setup";
import * as Addresses from "./constants/addresses";
import makeOrder from "./utils/order";
import * as orderConstants from "../src/constants/order";
import * as utils from "../src/utils";
import Contracts from "../src/contracts";

const getContractInstances = contracts => {
  const promises = contracts.map(contract =>
    utils.getContractInstance(b0xJS.web3, contract.abi, contract.address)
  );
  return Promise.all(promises);
};

const initAllContractInstances = async () => {
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

const setupB0xToken = ({
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

const setupLoanTokens = ({ loanTokens, lenders, transferAmt, ownerTxOpts }) => {
  const promises = [
    loanTokens[0].methods.transfer(lenders[0], transferAmt).send(ownerTxOpts),
    loanTokens[1].methods.transfer(lenders[1], transferAmt).send(ownerTxOpts),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[0].options.address,
      ownerAddress: lenders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: loanTokens[1].options.address,
      ownerAddress: lenders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};

const setupCollateralTokens = ({
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
      tokenAddress: collateralTokens[0].options.address,
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: collateralTokens[1].options.address,
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};

const setupInterestTokens = ({
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
      tokenAddress: interestTokens[0].options.address,
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xVault.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: interestTokens[1].options.address,
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xVault.address
    })
  ];

  return Promise.all(promises);
};

describe("filling orders", () => {
  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens,
      b0xToken
    } = await initAllContractInstances();

    const owner = Addresses.ACCOUNTS[0];
    const lenders = [Addresses.ACCOUNTS[1], Addresses.ACCOUNTS[3]];
    const traders = [Addresses.ACCOUNTS[2], Addresses.ACCOUNTS[4]];

    const ownerTxOpts = { from: owner };
    const transferAmt = b0xJS.web3.toWei(1000000, "ether");

    await setupB0xToken({
      b0xToken,
      lenders,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await setupLoanTokens({
      loanTokens,
      lenders,
      transferAmt,
      ownerTxOpts
    });
    await setupCollateralTokens({
      collateralTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await setupInterestTokens({
      interestTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });
  });

  describe("takeLoanOrderAsLender", async () => {
    test.skip("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[1];
      const takerAddress = Addresses.ACCOUNTS[0];
      const txOpts = { from: takerAddress, gas: 1000000 };

      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.TRADER,
        makerAddress,
        salt: B0xJS.generatePseudoRandomSalt()
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );
      const receipt = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        txOpts
      );

      const loanTokenAmountFilled = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      expect(loanTokenAmountFilled).toBe("0");
    });
  });

  describe("takeLoanOrderAsTrader", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[0];
      const takerAddress = Addresses.ACCOUNTS[1];
      const txOpts = { from: takerAddress, gas: 1000000 };
      const collateralTokenAddress = constantsZX.NULL_ADDRESS; // Addresses.ZRXToken;
      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.LENDER,
        makerAddress,
        salt: B0xJS.generatePseudoRandomSalt(),
        collateralTokenAddress
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );

      const loanTokenAmountFilled = "20";

      const receipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenAddress,
        loanTokenAmountFilled,
        txOpts
      );

      const loanTokenAmountFilledReturn = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      console.log(JSON.stringify(receipt, null, 2));

      expect(loanTokenAmountFilledReturn).toBe("0");
    });
  });
});
