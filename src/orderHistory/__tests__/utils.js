import Accounts from "../../core/__tests__/accounts";

export const getAccounts = () => ({
  owner: Accounts[0].address,
  lenders: [Accounts[5].address, Accounts[7].address],
  traders: [Accounts[6].address, Accounts[8].address]
});
