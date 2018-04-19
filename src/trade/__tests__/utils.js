import { clone, pathOr } from "ramda";
import b0xJS from "../../core/__tests__/setup";
import { protocol } from "../../../../config/secrets";
import * as CoreUtils from "../../core/utils";
import { local as Contracts } from "../../contracts";

const zxConstants = pathOr(null, ["development", "ZeroEx"], protocol);

const setupZRXToken = async ({
  ZRXToken,
  traders,
  ownerTxOpts,
  transferAmount
}) => {
  const promises = [
    ZRXToken.methods
      .transfer(traders[0], transferAmount)
      .send(clone(ownerTxOpts)),
    ZRXToken.methods
      .transfer(traders[1], transferAmount)
      .send(clone(ownerTxOpts)),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: ZRXToken.options.address.toLowerCase(),
      ownerAddress: traders[0],
      spenderAddress: Contracts.B0xTo0x.address
    }),
    b0xJS.setAllowanceUnlimited({
      tokenAddress: ZRXToken.options.address.toLowerCase(),
      ownerAddress: traders[1],
      spenderAddress: Contracts.B0xTo0x.address
    })
  ];

  await Promise.all(promises);
  console.log("setupZRXToken done.");
};

const setupOrder0xToken = async ({
  order0xToken,
  makerOf0xOrder,
  transferAmount,
  ownerTxOpts
}) => {
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
  console.log("setup0xOrderToken done.");
};

const initAllContractInstances = () => {
  const order0xToken = CoreUtils.getContractInstance(
    b0xJS.web3,
    Contracts.TestToken7.abi,
    Contracts.TestToken7.address
  );

  const ZRXToken = CoreUtils.getContractInstance(
    b0xJS.web3,
    Contracts.EIP20.abi,
    zxConstants.ZRXToken.toLowerCase()
  );

  return { order0xToken, ZRXToken };
};

export const setupAll = async ({
  owner,
  traders,
  makerOf0xOrder,
  transferAmount
}) => {
  const ownerTxOpts = { from: owner };
  const { order0xToken, ZRXToken } = initAllContractInstances();

  const doesOrder0xTokenExist = await CoreUtils.doesContractExistAtAddress(
    b0xJS.web3,
    order0xToken.options.address.toLowerCase()
  );
  if (!doesOrder0xTokenExist)
    throw new Error("order0xTokenExist does not exist");

  const doesZRXExist = await CoreUtils.doesContractExistAtAddress(
    b0xJS.web3,
    ZRXToken.options.address.toLowerCase()
  );
  if (!doesZRXExist) throw new Error("ZRX does not exist");

  await setupOrder0xToken({
    order0xToken,
    makerOf0xOrder,
    transferAmount,
    ownerTxOpts
  });
  await setupZRXToken({
    ZRXToken,
    traders,
    ownerTxOpts,
    transferAmount
  });
};
