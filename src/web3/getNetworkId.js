export default web3 =>
  new Promise(resolve => {
    web3.eth.net.getId((_, b) => resolve(b));
  });
