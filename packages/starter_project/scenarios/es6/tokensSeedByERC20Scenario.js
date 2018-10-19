const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function tokensSeedByERC20Scenario(l, c, ownerAddress, lenderAddress, trader1Address, trader2Address) {
  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateral1Token = artifacts.testToken2;
  const collateral2Token = artifacts.testToken3;
  const exchangeToken = artifacts.testToken4;

  // getting balance of loanToken at lenderAddress
  let balance = await c.bzxjs.getBalance({
    tokenAddress: loanToken.address.toLowerCase(),
    ownerAddress: lenderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  let loanTokenContract = new c.web3.eth.Contract(loanToken.abi, loanToken.address);
  await loanTokenContract.methods
    .transfer(lenderAddress, c.web3.utils.toWei("1000", "ether"))
    .send({ from: ownerAddress, gasLimit: utils.gasLimit });

  // getting balance of loanToken at lenderAddress
  balance = await c.bzxjs.getBalance({
    tokenAddress: loanToken.address.toLowerCase(),
    ownerAddress: lenderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of interestToken at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: interestToken.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  let interestTokenContract = new c.web3.eth.Contract(interestToken.abi, interestToken.address);
  await interestTokenContract.methods
    .transfer(trader1Address, c.web3.utils.toWei("1000", "ether"))
    .send({ from: ownerAddress, gasLimit: utils.gasLimit });

  // getting balance of interestToken at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: interestToken.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of collateral1Token at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral1Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  let collateral1TokenContract = new c.web3.eth.Contract(collateral1Token.abi, collateral1Token.address);
  await collateral1TokenContract.methods
    .transfer(trader1Address, c.web3.utils.toWei("1000", "ether"))
    .send({ from: ownerAddress, gasLimit: utils.gasLimit });

  // getting balance of collateral1Token at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral1Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of collateral2Token at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral2Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  let collateral2TokenContract = new c.web3.eth.Contract(collateral2Token.abi, collateral2Token.address);
  await collateral2TokenContract.methods
    .transfer(trader1Address, c.web3.utils.toWei("1000", "ether"))
    .send({ from: ownerAddress, gasLimit: utils.gasLimit });

  // getting balance of collateral2Token at trader1Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral2Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of exchangeToken at trader2Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: exchangeToken.address.toLowerCase(),
    ownerAddress: trader2Address.toLowerCase()
  });
  console.dir(balance.toString());

  let exchangeTokenContract = new c.web3.eth.Contract(exchangeToken.abi, exchangeToken.address);
  await exchangeTokenContract.methods
    .transfer(trader2Address, c.web3.utils.toWei("1000", "ether"))
    .send({ from: ownerAddress, gasLimit: utils.gasLimit });

  // getting balance of exchangeToken at trader2Address
  balance = await c.bzxjs.getBalance({
    tokenAddress: exchangeToken.address.toLowerCase(),
    ownerAddress: trader2Address.toLowerCase()
  });
  console.dir(balance.toString());
}

module.exports.tokensSeedByERC20Scenario = tokensSeedByERC20Scenario;
