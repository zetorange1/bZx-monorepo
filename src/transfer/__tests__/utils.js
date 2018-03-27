import b0xJS from "../../core/__tests__/setup";

export const getBalances = async ({ addresses, tokenAddress }) => {
  const promises = addresses.map(ownerAddress =>
    b0xJS.getBalance({
      tokenAddress,
      ownerAddress
    })
  );
  const balances = Promise.all(promises);
  return balances;
};
