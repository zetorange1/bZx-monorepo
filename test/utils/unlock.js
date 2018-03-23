export const unlock = async (web3, { address, password, privateKey }) => {
  try {
    await web3.eth.personal.importRawKey(privateKey, password);
  } catch (e) {
    console.log(`Tried to import address: ${address}`, e.message);
  }

  const res = await web3.eth.personal.unlockAccount(address, password);
  return res;
};
