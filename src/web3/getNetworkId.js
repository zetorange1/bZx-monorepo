export default web3 =>
  new Promise((resolve, reject) => {
    web3.eth.net
      .getId()
      .then(resolve)
      .catch(reject);
  });
