
//const provider = new web3.providers.HttpProvider("http://localhost:8545");
const trufflecontract = require("truffle-contract");

let BZxOracle = artifacts.require("TestNetOracle");

let BZxVault = artifacts.require("BZxVault");

let DaiToken = artifacts.require("TestToken9"); // fake DAI

let CollateralToken = artifacts.require("TestToken2")

let RandomToken = artifacts.require("TestToken3");

const LoanToken = artifacts.require("LoanToken");
const PositionToken = artifacts.require("PositionToken");

const BZxProxy = artifacts.require("BZxProxy");
const BZx = artifacts.require("BZx");

const WETHInterface = artifacts.require("WETHInterface");

const BN = require("bn.js");
const utils = require("../../../test/utils/utils.js");
const Reverter = require("../../../test/utils/reverter");
const eventsHelper = require("../../../test/utils/eventsHelper");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

const PRECISION = utils.toWei("1", "ether");

const config = require("../../../protocol-config.js");

contract("BZxTest: loan tokenization", function(accounts) {
  let reverter = new Reverter(web3);
  //afterEach("revert", reverter.revert);

  const WETH_ADDRESS = config["addresses"]["development"]["ZeroEx"]["WETH9"];

  let bzx;
  let collateralToken;
  let iToken;
  let pToken;
  let weth;
  let random_token;
  let owner = accounts[0];
  let lender1 = accounts[1];
  let trader1 = accounts[2];

  before("before", async () => {

    iToken = await LoanToken.new(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      WETH_ADDRESS,
      WETH_ADDRESS, // loan token
      "bZx ETH iToken",
      "iETH"
    );

    // 2x leverage short on ETH
    let leverageAmount = utils.toWei("2", "ether");
    
    await iToken.initLeverage(
      [
        leverageAmount, // 2x leverage
        utils.toWei("50", "ether"), // initialMarginAmount
        utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    
    let loanOrderHash = await iToken.loanOrderHashes.call(leverageAmount);
    
    pToken = await PositionToken.new(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      WETH_ADDRESS,
      WETH_ADDRESS, // loan token
      DaiToken.address, // trade token
      NULL_ADDRESS,
      leverageAmount,
      loanOrderHash,
      "Perpetual Short ETH 2x",
      "psETH2x"
    );

    await pToken.setLoanTokenLender(iToken.address);

    weth = await WETHInterface.at(WETH_ADDRESS);

    bzx = await BZx.at(BZxProxy.address);

    collateralToken = await CollateralToken.deployed();
    await collateralToken.transfer(trader1, utils.toWei("100", "ether").toString(), { from: owner });

    random_token = await RandomToken.deployed();

    await reverter.snapshot();
  });

  after(async () => {
    await reverter.revert();
  });

  it("iToken should mint and burn with Ether", async () => {
    
    let balance = await iToken.balanceOf(lender1);
    let currentPrice = await iToken.tokenPrice();
    
    let sendAmount = utils.toWei("1", "ether");
    let amountMinted = await iToken.mintWithEther.call(
      { value: sendAmount, from: lender1 }
    );
    await iToken.mintWithEther(
      { value: sendAmount, from: lender1 }
    );

    let expectedAmount = sendAmount.mul(PRECISION).div(currentPrice);

    assert.isTrue((await iToken.balanceOf(lender1)).gt(balance), "(await iToken.balanceOf(lender1)).gt(balance)");
    assert.equal(amountMinted.toString(), expectedAmount.toString(), "amountMinted == expectedAmount");

    
    let burnAmount = utils.toWei("0.4", "ether");
    let amountPaidOut = await iToken.burnToEther.call(
      burnAmount,
      { from: lender1 }
    );
    await iToken.burnToEther(
      burnAmount,
      { from: lender1 }
    );

    expectedAmount = burnAmount.mul(currentPrice).div(PRECISION);

    assert.equal((await iToken.balanceOf(lender1)).toString(), utils.toWei("0.6", "ether").toString(), "await iToken.balanceOf(lender1) == utils.toWei(\"0.6\", \"ether\")");
    assert.equal(amountPaidOut.toString(), expectedAmount.toString(), "amountPaidOut == expectedAmount");

    await reverter.revert();
  });

  it("iToken should mint and burn with WETH", async () => {
    
    let balance = await iToken.balanceOf(lender1);
    let currentPrice = await iToken.tokenPrice();
    
    let sendAmount = utils.toWei("1", "ether");
    await weth.deposit({ value: sendAmount, from: lender1 });
    await weth.approve(iToken.address, sendAmount, { from: lender1 });

    let amountMinted = await iToken.mint.call(
      sendAmount,
      { from: lender1 }
    );
    await iToken.mint(
      sendAmount,
      { from: lender1 }
    );

    let expectedAmount = sendAmount.mul(PRECISION).div(currentPrice);

    assert.isTrue((await iToken.balanceOf(lender1)).gt(balance), "(await iToken.balanceOf(lender1)).gt(balance)");
    assert.equal(amountMinted.toString(), expectedAmount.toString(), "amountMinted == expectedAmount");

    
    let burnAmount = utils.toWei("0.2", "ether");
    let amountPaidOut = await iToken.burn.call(
      burnAmount,
      { from: lender1 }
    );
    await iToken.burn(
      burnAmount,
      { from: lender1 }
    );

    expectedAmount = burnAmount.mul(currentPrice).div(PRECISION);

    await weth.withdraw(expectedAmount);

    assert.equal((await iToken.balanceOf(lender1)).toString(), utils.toWei("0.8", "ether").toString(), "await iToken.balanceOf(lender1), utils.toWei(\"0.8\", \"ether\")");
    assert.equal(amountPaidOut.toString(), expectedAmount.toString(), "amountPaidOut == expectedAmount");

    await reverter.revert();
  });

  it("Borrow against iToken for margin trading", async () => {

    let sendAmount = utils.toWei("1", "ether");
    await iToken.mintWithEther(
      { value: sendAmount, from: lender1 }
    );

    await weth.deposit({ value: utils.toWei("10", "ether"), from: trader1 });
    await weth.approve(BZxVault.address, MAX_UINT, { from: trader1 });

    await collateralToken.approve(BZxVault.address, MAX_UINT, { from: trader1 });

    let marketLiquidity = await iToken.marketLiquidity.call();

    let leverageAmount = utils.toWei("2", "ether"); // 2x leverage

    // this block should fail since toggleDelegateApproved hasn't been called
    try {
      await iToken.borrowToken(
        marketLiquidity, // borrow full amount available
        leverageAmount,
        collateralToken.address,
        random_token.address, // tradeTokenToFillAddress,
        false, // withdrawOnOpen
        { from: trader1 }
      );
      assert.isTrue(false);
    } catch (e) {
      utils.ensureException(e);
    }

    // approve iToken to open a loan on my behalf
    await bzx.toggleDelegateApproved(iToken.address, true, { from: trader1 });

    // this will borrow from the iToken and open a margin loan in bZx with an immediate short position using random_token
    let tx = await iToken.borrowToken(
      marketLiquidity, // borrow full amount available
      leverageAmount,
      collateralToken.address,
      NULL_ADDRESS, //random_token.address, // tradeTokenToFillAddress,
      false, // withdrawOnOpen
      { from: trader1 }
    );

    //let event = eventsHelper.extractEvents(tx, "LogLoanTaken")[0];
    //let loanOrderHash = event.args.loanOrderHash;
    //let loanTokenAmountFilled = event.args.loanTokenAmount;
    
    let loanOrderHash = await iToken.loanOrderHashes(leverageAmount);
    
    let loanData = await bzx.getSingleLoan(loanOrderHash, trader1);
    //console.log(loanData);
    let loanTokenAmountFilled = parseInt("0x"+loanData.substr((4 * 64)+2, 64));
    //console.log("loanOrderHash",loanOrderHash);
    //console.log("loanTokenAmountFilled",loanTokenAmountFilled);
    //console.log("marketLiquidity",marketLiquidity.toString());

    assert.equal(marketLiquidity.toString(), loanTokenAmountFilled);

    await reverter.revert();
  });

  it("pToken should mint and burn", async () => {
    
    // add liquidity to the pToken lending pool (iToken)
    await iToken.mintWithEther(
      { value: utils.toWei("10", "ether"), from: lender1 }
    );

    // buy some pToken
    let currentPrice = await pToken.tokenPrice();
    //console.log("currentPrice",currentPrice.toString());
    let sendAmount = utils.toWei("1", "ether");
    let amountMinted = await pToken.mintWithEther.call(
      { value: sendAmount, from: trader1 }
    );
    await pToken.mintWithEther(
      { value: sendAmount, from: trader1 }
    );

    let expectedAmount = sendAmount.mul(PRECISION).div(currentPrice);
    assert.equal(amountMinted.toString(), expectedAmount.toString(), "amountMinted == expectedAmount (ETH buy)");

    // buy more (price should be different) - mint with loan token
    //currentPrice = await pToken.tokenPrice();
    //console.log("currentPrice",currentPrice.toString());
    sendAmount = utils.toWei("2", "ether");
    
    await weth.deposit({ value: sendAmount, from: trader1 });
    await weth.approve(pToken.address, sendAmount, { from: trader1 });

    amountMinted = await pToken.mintWithToken.call(
      weth.address, sendAmount, { from: trader1 }
    );
    await pToken.mintWithToken(
      weth.address, sendAmount, { from: trader1 }
    );

    //expectedAmount = sendAmount.mul(PRECISION).div(currentPrice);
    //assert.equal(amountMinted.toString(), expectedAmount.toString(), "amountMinted == expectedAmount (WETH buy)");

    // burn some of the token Ether
    //currentPrice = await pToken.tokenPrice();
    //console.log("currentPrice",currentPrice.toString());
    let burnAmount = utils.toWei("0.001", "ether");
    let amountPaidOut = await pToken.burnToEther.call(
      burnAmount,
      { from: trader1 }
    );
    await pToken.burnToEther(
      burnAmount,
      { from: trader1 }
    );

    //expectedAmount = burnAmount.mul(currentPrice).div(PRECISION);
    //assert.equal(amountPaidOut.toString(), expectedAmount.toString(), "amountPaidOut == expectedAmount");

    // burn remaining amount of token to loan token
    //currentPrice = await pToken.tokenPrice();
    //console.log("currentPrice",currentPrice.toString());
    burnAmount = await pToken.balanceOf(trader1);
    amountPaidOut = await pToken.burnToToken.call(
      weth.address,
      burnAmount,
      { from: trader1 }
    );
    await pToken.burnToToken(
      weth.address,
      burnAmount,
      { from: trader1 }
    );

    //expectedAmount = burnAmount.mul(currentPrice).div(PRECISION);
    //assert.equal(amountPaidOut.toString(), expectedAmount.toString(), "amountPaidOut == expectedAmount");

    currentPrice = await pToken.tokenPrice();
    let balance = await pToken.balanceOf(trader1);
    //console.log("final price",currentPrice.toString());
    //console.log("final balance",balance.toString());

    assert.equal(balance.toString(), "0", "balance == 0");

    await reverter.revert();
  });

  it("iToken should handle redemption properly", async () => {

    // add liquidity to the pToken lending pool (iToken)
    await iToken.mintWithEther(
      { value: utils.toWei("10", "ether"), from: lender1 }
    );

    let tokenBalance = await iToken.balanceOf(lender1);

    // buy some pToken
    await pToken.mintWithEther(
      { value: utils.toWei("5", "ether"), from: trader1 }
    );

    let ethBalance1 = new BN(await web3.eth.getBalance(lender1));

    // burn full amount of iToken
    let tx = await iToken.burnToEther(
      utils.toWei("10", "ether"),
      { from: lender1 }
    );

    let burnEvent = eventsHelper.extractEvents(tx, "Burn")[0];
    let claimedAsset1 = new BN(burnEvent.args.assetAmount);
    //console.log("claimedAsset1", claimedAsset1);

    let tokenBalance1 = await iToken.balanceOf(lender1);
    let burntTokenReserved = await iToken.burntTokenReserved.call();
    let burntTokenReservedUser = (await iToken.burntTokenReserveList.call(0)).amount;
    let ethBalance2 = new BN(await web3.eth.getBalance(lender1));
    let ethAmountRedeemed = ethBalance2.sub(ethBalance1);

    let wethBalance1 = await weth.balanceOf(lender1);

    //console.log("ethAmountRedeemed",ethAmountRedeemed.toString());
    assert.isTrue(burntTokenReserved.gt(0), "burntTokenReserved > 0");
    assert.equal(burntTokenReserved.toString(), burntTokenReservedUser.toString(), "burntTokenReserved == burntTokenReservedUser");
    assert.isTrue(ethAmountRedeemed.lt(utils.toWei("10", "ether")), "ethAmountRedeemed < 10 ETH");
    
    assert.equal(tokenBalance.toString(), utils.toWei("10", "ether").toString(), "tokenBalance == 10");
    assert.equal(tokenBalance1.toString(), "0", "tokenBalance == 0");

    // this burn will free up ETH to return to the lender automatically
    tx = await pToken.burnToEther(
      utils.toWei("10", "ether"),
      { from: trader1 }
    );

    //console.log("marketLiquidity", (await iToken.marketLiquidity()).toString())

    let wethBalance2 = await weth.balanceOf(lender1);
    let wethAmountRedeemed = wethBalance2.sub(wethBalance1);
    let burntTokenReserved1 = await iToken.burntTokenReserved.call();
    assert.equal(burntTokenReserved1.toString(), "0", "burntTokenReserved1 == 0");
    assert.isTrue(claimedAsset1.add(wethAmountRedeemed).gte(utils.toWei("10", "ether")), "total claimed assets >= 10 ETH");

    await reverter.revert();
  });

});
