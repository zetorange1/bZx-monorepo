import { clone, pathOr } from "ramda";
import b0xJS from "../../core/__tests__/setup";
import { protocol } from "../../../../config/secrets";
import * as CoreUtils from "../../core/utils";
import { local as Contracts } from "../../contracts";

const zxConstants = pathOr(null, ["development", "ZeroEx"], protocol);

const setupOrder0xToken = async ({
  order0xToken,
  makerOf0xOrder,
  transferAmount,
  ownerTxOpts
}) => {
  const doesTokenTransferProxyExist = await CoreUtils.doesContractExistAtAddress(
    b0xJS.web3,
    zxConstants.TokenTransferProxy.toLowerCase()
  );
  if (!doesTokenTransferProxyExist)
    throw new Error("TokenTransferProxy does not exist.");

  const promises = [
    order0xToken.methods
      .transfer(makerOf0xOrder, transferAmount)
      .send(clone(ownerTxOpts)),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: order0xToken.options.address.toLowerCase(),
      ownerAddress: makerOf0xOrder,
      spenderAddress: zxConstants.TokenTransferProxy.toLowerCase()
    })
  ];

  await Promise.all(promises);
};

export const initAllContractInstances = () => {
  const order0xToken = CoreUtils.getContractInstance(
    b0xJS.web3,
    Contracts.TestToken7.abi,
    Contracts.TestToken7.address
  );

  return { order0xToken };
};

export const setupAll = async ({ owner, makerOf0xOrder, transferAmount }) => {
  const ownerTxOpts = { from: owner };
  const { order0xToken } = initAllContractInstances();

  const doesOrder0xTokenExist = await CoreUtils.doesContractExistAtAddress(
    b0xJS.web3,
    order0xToken.options.address.toLowerCase()
  );
  if (!doesOrder0xTokenExist)
    throw new Error("order0xTokenExist does not exist");

  await setupOrder0xToken({
    order0xToken,
    makerOf0xOrder,
    transferAmount,
    ownerTxOpts
  });
};
