

const deployNotifier = false;

var BZxOracle;
var BZRxToken = artifacts.require("BZRxToken");
var BZxVault = artifacts.require("BZxVault");
var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
//var OracleRegistry = artifacts.require("OracleRegistry");
var OracleNotifier = artifacts.require("OracleNotifier");

//var WETH = artifacts.require("WETHInterface");
var BZxEther = artifacts.require("BZxEther");

const path = require("path");
const config = require("../protocol-config.js");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const OLD_ORACLE_ADDRESS = "";
//const OLD_ORACLE_ADDRESS = "0xf7412a8475e604C0C3Dfe73a118184cFE3494645"; // mainnet
//const OLD_ORACLE_ADDRESS = "0x208ec15dbb52b417343887ed8a5523d3c4d23e55"; // ropsten
//const OLD_ORACLE_ADDRESS = "0x4Ad8DBD6f2B08813E35b639Bb46DEe204cCCcd3D"; // kovan
//const OLD_ORACLE_ADDRESS = "0x76dE3d406FeE6c3316558406B17fF785c978E98C"; // rinkeby

module.exports = (deployer, network, accounts) => {

  let weth_token_address;

  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  } else {
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    BZxOracle = artifacts.require("BZxOracle");
  } else {
    BZxOracle = artifacts.require("TestNetOracle");
  }

  var bzrx_token_address;
  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    bzrx_token_address = config["addresses"][network]["BZRXToken"];
  } else {
    bzrx_token_address = BZRxToken.address;
  }

  let FULCRUM_ORACLE = "";
  if (network == "mainnet") {
    FULCRUM_ORACLE = "0xf257246627f7cb036ae40aa6cfe8d8ce5f0eba63";
  } else if (network == "ropsten") {
    FULCRUM_ORACLE = "0xd5f66f2ac36b6d765a1cfdacbb7a8868c2d91a9d";
  } else if (network == "kovan") {
    FULCRUM_ORACLE = "0x5d940C359165A8D4647cc8A237DCEF8b0c6B60de";
  }

  let FULCRUM_ORACLE2 = "";
  if (network == "mainnet") {
    FULCRUM_ORACLE2 = "0x4c1974e5ff413c6e061ae217040795aaa1748e8b";
  } else if (network == "ropsten") {
    FULCRUM_ORACLE2 = "";
  }

  let FULCRUM_ORACLE3 = "";
  if (network == "mainnet") {
    FULCRUM_ORACLE3 = "0xc5c4554dc5ff2076206b5b3e1abdfb77ff74788b";
  } else if (network == "ropsten") {
    FULCRUM_ORACLE3 = "";
  }

  if (bzrx_token_address) {
    // ensure deployed protocol token

    let valueAmount = "0";
    if (!OLD_ORACLE_ADDRESS) {
      valueAmount = web3.utils.toWei("1", "ether");
    }

    deployer.then(async function() {

      var oracleNotifier;
      if (network == "development" || deployNotifier) {
        oracleNotifier = await deployer.deploy(OracleNotifier);
      } else {
        if (!config["addresses"][network]["OracleNotifier"]) {
          console.log("OracleNotifier address not found in config!");
          process.exit();
        }
        oracleNotifier = await OracleNotifier.at(config["addresses"][network]["OracleNotifier"]);
      }

      /*await deployer.deploy(
        BZxOracle,
        BZxVault.address,
        config["addresses"][network]["KyberContractAddress"] || NULL_ADDRESS,
        weth_token_address,
        bzrx_token_address,
        oracleNotifier.address
        { from: accounts[0] }
      );*/
      await deployer.deploy(
        BZxOracle,
        { from: accounts[0] }
      );
      

      //const oracle = await BZxOracle.deployed();
      //const oracle = await BZxOracle.at("...");

      const oracleAddress = oracle.address;

      if (network == "mainnet") {
        await oracle.setSupportedTokensBatch([
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359", // SAI
          "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
          "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR
          "0xdd974d5c2e2928dea5f71b9825b8b646686bd200", // KNC
          "0x1985365e9f78359a9b6ad760e32412f4a445e862", // REP
          "0x0d8775f648430679a709e98d2b0cb6250d2887ef", // BAT
          "0xe41d2489571d322189246dafa5ebde1f4699f498", // ZRX
          "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
          "0x57ab1ec28d129707052df4df418d58a2d46d5f51", // SUSD
          "0x6b175474e89094c44da98b954eedeac495271d0f"  // DAI
        ],
        [
          "true", // ETH
          "true", // WETH
          "true", // USDC
          "true", // SAI
          "true", // WBTC
          "true", // MKR
          "true", // KNC
          "true", // REP
          "true", // BAT
          "true", // ZRX
          "true", // LINK
          "true", // SUSD
          "true"  // DAI
        ]
        );

        await oracle.setDecimalsBatch([
          "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359", // SAI
          "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
          "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR
          "0xdd974d5c2e2928dea5f71b9825b8b646686bd200", // KNC
          "0x1985365e9f78359a9b6ad760e32412f4a445e862", // REP
          "0x0d8775f648430679a709e98d2b0cb6250d2887ef", // BAT
          "0xe41d2489571d322189246dafa5ebde1f4699f498", // ZRX
          "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
          "0x57ab1ec28d129707052df4df418d58a2d46d5f51", // SUSD
          "0x6b175474e89094c44da98b954eedeac495271d0f"  // DAI
        ]);

        await oracle.setMaxSourceAmountAllowedBatch([
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359", // SAI
          "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
          "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR
          "0xdd974d5c2e2928dea5f71b9825b8b646686bd200", // KNC
          //"0x1985365e9f78359a9b6ad760e32412f4a445e862", // REP
          "0x0d8775f648430679a709e98d2b0cb6250d2887ef", // BAT
          "0xe41d2489571d322189246dafa5ebde1f4699f498", // ZRX
          "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
          //"0x57ab1ec28d129707052df4df418d58a2d46d5f51", // SUSD
          //"0x6b175474e89094c44da98b954eedeac495271d0f"  // DAI
        ],
        [
          "70000000000",                // USDC
          "75000000000000000000000",    // SAI
          "450000000",                  // WBTC
          "100000000000000000000",      // MKR
          "70000000000000000000000",    // KNC
          //"",                         // REP - slippage high for small amounts
          "100000000000000000000000",   // BAT
          "15000000000000000000000",    // ZRX - (low liquidity)
          "19000000000000000000000",    // LINK
          //"",                         // SUSD
          //"",                         // DAI
        ]
        );


        /*await oracle.setUSDStableCoinsBatch([
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
          "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359", // SAI
        ],
        [
          "true", // USDC
          "true", // SAI
        ]
        );*/

        /*
        let txData = web3.eth.abi.encodeFunctionSignature('registerWallet(address)') +
          web3.eth.abi.encodeParameters(['address'], [oracleAddress]).substr(2);

        await web3.eth.sendTransaction({
          from: accounts[0],
          to: config["addresses"][network]["KyberRegisterWallet"],
          data: txData,
          gasPrice: 12000000000
        });

        await oracle.setFeeWallet("0x13ddac8d492e463073934e2a101e419481970299");
        */
      } else if (network == "kovan") {
        await oracle.setSupportedTokensBatch([
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xd0a1e359811322d97991e03f863a0c30c2cf029c", // WETH
          "0xc4375b7de8af5a38a93548eb8453a498222c4ff2", // SAI
          "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa", // DAI
          "0x71DD45d9579A499B58aa85F50E5E3B241Ca2d10d", // CHAI
        ],
        [
          "true", // ETH
          "true", // WETH
          "true", // SAI
          "true", // DAI
          "true", // CHAI
        ]
        );

        await oracle.setDecimalsBatch([
          "0xd0a1e359811322d97991e03f863a0c30c2cf029c", // WETH
          "0xc4375b7de8af5a38a93548eb8453a498222c4ff2", // SAI
          "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa", // DAI
          "0x71DD45d9579A499B58aa85F50E5E3B241Ca2d10d", // CHAI
        ]);
      } else if (network == "rinkeby") {
        await oracle.setSupportedTokensBatch([
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
          "0xc778417e063141139fce010982780140aa0cd5ab", // WETH
          "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea", // SAI (Compound)
          "0x6e894660985207feb7cf89faf048998c71e8ee89", // REP (Compound)
        ],
        [
          "true", // ETH
          "true", // WETH
          "true", // SAI
          "true", // REP
        ]
        );

        await oracle.setDecimalsBatch([
          "0xc778417e063141139fce010982780140aa0cd5ab", // WETH
          "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea", // SAI (Compound)
          "0x6e894660985207feb7cf89faf048998c71e8ee89", // REP (Compound)
        ]);
      }

      var weth = await BZxEther.at(weth_token_address);
      if (!OLD_ORACLE_ADDRESS) {
        await weth.deposit({ value: valueAmount });
        await weth.transfer(oracleAddress, valueAmount);
      }

      await oracleNotifier.transferBZxOwnership(oracleAddress);

      var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
      await oracle.transferBZxOwnership(BZxProxy.address);
      await bZxProxy.setOracleReference(oracleAddress, oracleAddress);

      if (FULCRUM_ORACLE) {
        await bZxProxy.setOracleReference(FULCRUM_ORACLE, oracleAddress);
      }
      if (FULCRUM_ORACLE2) {
        await bZxProxy.setOracleReference(FULCRUM_ORACLE2, oracleAddress);
      }
      if (FULCRUM_ORACLE3) {
        await bZxProxy.setOracleReference(FULCRUM_ORACLE3, oracleAddress);
      }
      
      /*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
        await oracle.setDebugMode(true);
      }*/

      //var oracleRegistry = await OracleRegistry.deployed();

      if (OLD_ORACLE_ADDRESS) {
        var CURRENT_OLD_ORACLE_ADDRESS = OLD_ORACLE_ADDRESS; //"last_deployed_oracle_contract"; //await oracleRegistry.oracleAddresses(0);
        var bZxOracleOld = await BZxOracle.at(CURRENT_OLD_ORACLE_ADDRESS);

        //await oracleRegistry.removeOracle(CURRENT_OLD_ORACLE_ADDRESS, 0);
        //await oracleRegistry.addOracle(oracleAddress, "bZxOracle");

        if (FULCRUM_ORACLE !== OLD_ORACLE_ADDRESS && FULCRUM_ORACLE2 !== OLD_ORACLE_ADDRESS && FULCRUM_ORACLE3 !== OLD_ORACLE_ADDRESS) {
          await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);
        }

        /*if (CURRENT_OLD_ORACLE_ADDRESS.toLowerCase() != OLD_ORACLE_ADDRESS.toLowerCase()) {
          await bZxProxy.setOracleReference(CURRENT_OLD_ORACLE_ADDRESS, oracleAddress);
        }*/

        /*await bZxOracleOld.transferEther(
          oracleAddress,
          web3.utils.toWei(10000000, "ether")
        );*/


        let ethBalance = await web3.eth.getBalance(bZxOracleOld.address);
        if (ethBalance.toString() !== "0") {
          await bZxOracleOld.wrapEther();
          console.log("Done wrapping ETH to WETH.");
        }

        let tokenBalance;

        tokenBalance = await weth.balanceOf(bZxOracleOld.address);
        if (tokenBalance.toString() !== "0") {
          await bZxOracleOld.transferToken(weth.address, oracleAddress, tokenBalance);
          console.log("Done with WETH transfer.");
        }

        if (network == "mainnet") {
          let otherToken;

          // KNC Transfer
          otherToken = await BZxEther.at("0xdd974d5c2e2928dea5f71b9825b8b646686bd200");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with KNC transfer.");
          }

          // SAI Transfer
          otherToken = await BZxEther.at("0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with SAI transfer.");
          }

          // REP Transfer
          otherToken = await BZxEther.at("0x1985365e9f78359a9B6AD760e32412f4a445E862");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with REP transfer.");
          }

          // USDC Transfer
          otherToken = await BZxEther.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with USDC transfer.");
          }

          // WBTC Transfer
          otherToken = await BZxEther.at("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with WBTC transfer.");
          }

          // ZRX Transfer
          otherToken = await BZxEther.at("0xe41d2489571d322189246dafa5ebde1f4699f498");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with ZRX transfer.");
          }

          // BAT Transfer
          otherToken = await BZxEther.at("0x0d8775f648430679a709e98d2b0cb6250d2887ef");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with BAT transfer.");
          }

          // LINK Transfer
          otherToken = await BZxEther.at("0x514910771af9ca656af840dff83e8264ecf986ca");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with LINK transfer.");
          }

          // MKR Transfer
          otherToken = await BZxEther.at("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with MKR transfer.");
          }

          // DAI Transfer
          otherToken = await BZxEther.at("0x6b175474e89094c44da98b954eedeac495271d0f");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with DAI transfer.");
          }

          // SUSD Transfer
          otherToken = await BZxEther.at("0x57ab1ec28d129707052df4df418d58a2d46d5f51");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
            console.log("Done with SUSD transfer.");
          }

          console.log("Done with other token transfers.");
        }

        if (network == "development") {
          await oracle.slippageMultiplier(web3.utils.toWei("97", "ether")); // 3% slippage

          for(let i=0; i <= 9; i++) {
            let t = await artifacts.require("TestToken"+i);

            let rate = (await bZxOracleOld.getTradeData(
              t.address,
              weth_token_address,
              "0"
            )).sourceToDestRate;
            await oracle.setRates(
              t.address,
              weth_token_address,
              rate.toString()
            );
          }

          let TestNetFaucet = artifacts.require("TestNetFaucet");
          let testNetFaucet = await TestNetFaucet.deployed();
          await oracle.setFaucetContractAddress(testNetFaucet.address);
          await testNetFaucet.setOracleContractAddress(oracleAddress);
        }
      } else {
        //await oracleRegistry.addOracle(oracleAddress, "bZxOracle");
      }

      console.log(`   > [${parseInt(path.basename(__filename))}] BZxOracle deploy: #done`);
    });
  }
};
