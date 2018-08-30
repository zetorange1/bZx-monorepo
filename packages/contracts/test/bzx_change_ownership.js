const BZx = artifacts.require("BZx");
const BZxProxy = artifacts.require("BZxProxy");
const BZxVault = artifacts.require("BZxVault");
const BZxOracle = artifacts.require("TestNetOracle");
const ERC20 = artifacts.require("ERC20");

const BZxTo0xV2 = artifacts.require("BZxTo0xV2");
const Exchange0xV2 = artifacts.require("ExchangeV2InterfaceWithEvents");
const ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

const BigNumber = require("bignumber.js");
const BN = require("bn.js");
const { Interface, providers, Contract } = require("ethers");

import Web3Utils from "web3-utils";
import {
    assetDataUtils,
    signatureUtils,
    generatePseudoRandomSalt,
    orderHashUtils
} from "@0xproject/order-utils";

var config = require("../protocol-config.js");

const Reverter = require("./utils/reverter");
const utils = require("./utils/utils.js");

const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

const SignatureType = Object.freeze({
    Illegal: 0,
    Invalid: 1,
    EIP712: 2,
    EthSign: 3,
    Wallet: 4,
    Validator: 5,
    PreSigned: 6
});

contract("BZxTest: ownership transfer", function(accounts) {
    let reverter = new Reverter(web3);
    var bZx;
    var vault;
    var oracle;
    var bZxTo0xV2;

    var test_tokens = [];

    var zrx_token;
    var exchange_0xV2;
    var zeroExV2Helper;

    // account roles
    var owner = accounts[0]; // owner/contract creator, holder of all tokens
    var lender1 = accounts[1]; // lender 1
    var trader1 = accounts[2]; // trader 1
    var lender2 = accounts[3]; // lender 2
    var trader2 = accounts[4]; // trader 2
    var maker1 = accounts[7]; // maker of 0x order
    var maker2 = accounts[8]; // maker of 0x order

    var loanToken1;
    var loanToken2;
    var collateralToken1;
    var collateralToken2;
    var interestToken1;
    var interestToken2;
    var maker0xV2Token1;

    var stranger = accounts[6];
    var strangerLender = accounts[5];
    var strangerTrader = accounts[9];

    before("Init: retrieve all deployed contracts", async () => {
        vault = await BZxVault.deployed();
        bZxTo0xV2 = await BZxTo0xV2.deployed();
        oracle = await BZxOracle.deployed();
        bZx = await BZx.at((await BZxProxy.deployed()).address);
        exchange_0xV2 = await Exchange0xV2.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV2"]);
        zeroExV2Helper = await ZeroExV2Helper.deployed();
        zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);
    });

    before("Init: retrieve all deployed test tokens and handle token transfers and approvals", async () => {
        for (var i = 0; i < 10; i++) {
            test_tokens[i] = await artifacts.require("TestToken" + i).deployed();
        }

        loanToken1 = test_tokens[0];
        loanToken2 = test_tokens[1];
        collateralToken1 = test_tokens[2];
        collateralToken2 = test_tokens[3];
        interestToken1 = test_tokens[4];
        interestToken2 = test_tokens[5];
        maker0xV2Token1 = test_tokens[7];

        await loanToken1.transfer(lender1, web3.toWei(1000000, "ether"));
        await loanToken2.transfer(lender2, web3.toWei(1000000, "ether"));
        await loanToken1.approve(vault.address, MAX_UINT, { from: lender1 });
        await loanToken2.approve(vault.address, MAX_UINT, { from: lender2 });
        await collateralToken1.transfer(trader1, web3.toWei(1000000, "ether"));
        await collateralToken1.transfer(trader2, web3.toWei(1000000, "ether"));
        await collateralToken2.transfer(trader1, web3.toWei(1000000, "ether"));
        await collateralToken2.transfer(trader2, web3.toWei(1000000, "ether"));
        await collateralToken1.approve(vault.address, MAX_UINT, {from: trader1});
        await collateralToken1.approve(vault.address, MAX_UINT, {from: trader2});
        await collateralToken2.approve(vault.address, MAX_UINT, {from: trader1});
        await collateralToken2.approve(vault.address, MAX_UINT, {from: trader2});
        await interestToken1.transfer(trader1, web3.toWei(1000000, "ether"));
        await interestToken1.transfer(trader2, web3.toWei(1000000, "ether"));
        await interestToken2.transfer(trader1, web3.toWei(1000000, "ether"));
        await interestToken2.transfer(trader2, web3.toWei(1000000, "ether"));
        await interestToken1.transfer(strangerTrader, web3.toWei(1000000, "ether"));
        await interestToken1.transfer(strangerLender, web3.toWei(1000000, "ether"));
        await interestToken1.approve(vault.address, MAX_UINT, { from: trader1 });
        await interestToken1.approve(vault.address, MAX_UINT, { from: trader2 });
        await interestToken1.approve(vault.address, MAX_UINT, { from: strangerTrader });
        await interestToken1.approve(vault.address, MAX_UINT, { from: strangerLender});
        await interestToken2.approve(vault.address, MAX_UINT, { from: trader1 });
        await interestToken2.approve(vault.address, MAX_UINT, { from: trader2 });
        await maker0xV2Token1.transfer(maker1, web3.toWei(10000, "ether"));
        await maker0xV2Token1.transfer(maker2, web3.toWei(10000, "ether"));
        await maker0xV2Token1.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],MAX_UINT,{ from: maker1 });
        await maker0xV2Token1.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],MAX_UINT,{ from: maker2 });
        await zrx_token.transfer(trader1, web3.toWei(10000, "ether"));
        await zrx_token.transfer(trader2, web3.toWei(10000, "ether"));
        await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, { from: trader1 });
        await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, { from: trader2 });
        await zrx_token.transfer(maker1, web3.toWei(10000, "ether"));
        await zrx_token.transfer(maker2, web3.toWei(10000, "ether"));
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],MAX_UINT,{ from: maker1 });
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],MAX_UINT,{ from: maker2 });
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],MAX_UINT,{ from: maker1 });
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],MAX_UINT,{ from: maker2 });

        assert.isTrue((await loanToken1.balanceOf.call(lender1)).eq(web3.toWei(1000000, "ether")));
        assert.isTrue((await collateralToken1.balanceOf.call(trader1)).eq(web3.toWei(1000000, "ether")));
        assert.isTrue((await interestToken1.balanceOf.call(trader1)).eq(web3.toWei(1000000, "ether")));

        assert.isTrue((await loanToken1.allowance.call(lender1, vault.address)).eq(MAX_UINT));
        assert.isTrue((await collateralToken1.allowance.call(trader1, vault.address)).eq(MAX_UINT));
        assert.isTrue((await interestToken1.allowance.call(trader1, vault.address)).eq(MAX_UINT));
    });

    context("Off-chain loans: transfer `trader` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init off-chain `trader` loan", async () => {
            order = generateTraderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = await sign(lender1, orderHash);

            await bZx.takeLoanOrderAsTrader(
                orderAddresses(order),
                orderValues(order),
                collateralToken1.address,
                web3.toWei(12.3, "ether"),
                signature,
                {from: trader1}
            );
        })

        it("shouldn't allow stranger to transfer ownership of trader's loan", async () => {
            try {
                assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: strangerTrader}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow trader to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: trader1}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 0);
            assert.equal(await countOrdersForUser(trader1), 1);

            await bZx.changeTraderOwnership(orderHash, strangerTrader, {from: trader1});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 1);
            assert.equal(await countOrdersForUser(trader1), 0);
        });

        it("should allow new owner to manage collateral", async () => {
            await bZx.changeCollateral(orderHash, interestToken1.address, {from: strangerTrader});
            await bZx.depositCollateral(orderHash, interestToken1.address, 10, {from: strangerTrader});
            await bZx.withdrawExcessCollateral(orderHash, interestToken1.address, 10, {from: strangerTrader});
        });

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    context("Off-chain loans: transfer `lender` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init off-chain `lender` loan", async () => {
            order = generateLenderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = await sign(trader2, orderHash);

            await bZx.takeLoanOrderAsLender(
                orderAddresses(order),
                orderValues(order),
                signature,
                {from: lender2}
            );
        })

        it("shouldn't allow stranger to transfer ownership of lender's loan", async () => {
            try {
                assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: strangerLender}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow lender to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: lender2}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 0);
            assert.equal(await countOrdersForUser(lender2), 1);

            await bZx.changeLenderOwnership(orderHash, strangerLender, {from: lender2});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 1);
            assert.equal(await countOrdersForUser(lender2), 0);
        });

        it("should allow new owner to manage collateral");

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    context("On-chain loans: transfer `trader` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init 'trader' on-chain loan", async () => {
            order = generateTraderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = await sign(lender1, orderHash);

            await bZx.pushLoanOrderOnChain(
                orderAddresses(order),
                orderValues(order),
                signature,
                {from: maker2}
            );

            await bZx.takeLoanOrderOnChainAsTrader(
                orderHash,
                collateralToken1.address,
                web3.toWei(20, "ether"),
                {from: trader2}
            );
        });

        it("shouldn't allow stranger to transfer ownership of trader's loan", async () => {
            try {
                assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: strangerTrader}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow trader to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: trader2}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 0);
            assert.equal(await countOrdersForUser(trader2), 1);

            await bZx.changeTraderOwnership(orderHash, strangerTrader, {from: trader2});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 1);
            assert.equal(await countOrdersForUser(trader2), 0);
        });

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    context("On-chain loans: transfer `lender` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init `lender` on-chain loan", async () => {
            order = generateLenderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = await sign(trader2, orderHash);

            await bZx.pushLoanOrderOnChain(
                orderAddresses(order),
                orderValues(order),
                signature,
                {from: maker1}
            );

            await bZx.takeLoanOrderOnChainAsLender(orderHash, {from: lender2});
        });

        it("shouldn't allow stranger to transfer ownership of lender's loan", async () => {
            try {
                assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: strangerLender}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow lender to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: lender2}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 0);
            assert.equal(await countOrdersForUser(lender2), 1);

            await bZx.changeLenderOwnership(orderHash, strangerLender, {from: lender2});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 1);
            assert.equal(await countOrdersForUser(lender2), 0);
        });

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    context("On-chain loans (with Presign): transfer `trader` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init on-chain `trader` loan with presign", async () => {
            order = generateTraderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = "0x"+"00".repeat(65)+"06"; // SignatureType == PreSigned (null-padded to 66 bytes)

            await bZx.preSign(
                order["makerAddress"],
                orderAddresses(order),
                orderValues(order),
                signature,
                {from: order["makerAddress"]}
            );

            await bZx.pushLoanOrderOnChain(
                orderAddresses(order),
                orderValues(order),
                signature,
                {from: maker2}
            );

            await bZx.takeLoanOrderOnChainAsTrader(
                orderHash,
                collateralToken1.address,
                web3.toWei(20, "ether"),
                {from: trader2}
            );
        });

        it("shouldn't allow stranger to transfer ownership of trader's loan", async () => {
            try {
                assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: strangerTrader}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow trader to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeTraderOwnership.call(orderHash, strangerTrader, {from: trader2}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 0);
            assert.equal(await countOrdersForUser(trader2), 1);

            await bZx.changeTraderOwnership(orderHash, strangerTrader, {from: trader2});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerTrader), 1);
            assert.equal(await countOrdersForUser(trader2), 0);
        });

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    context("On-chain loans (with Presign): transfer `lender` ownership", async () => {
        let order;
        let orderHash;

        before("before", async () => {
            await reverter.snapshot();
        });

        before("init on-chain `lender` loan with presign", async () => {
            order = generateLenderOrder();

            orderHash = await bZx.getLoanOrderHash.call(
                orderAddresses(order),
                orderValues(order)
            );

            let signature = "0x"+"00".repeat(65)+"06"; // SignatureType == PreSigned (null-padded to 66 bytes)

            await bZx.preSignWithHash(
                order["makerAddress"],
                orderHash,
                signature,
                {from: order["makerAddress"]}
            );

            await bZx.pushLoanOrderOnChain(
                orderAddresses(order),
                orderValues(order),
                signature,
                { from: maker1 }
            );

            await bZx.takeLoanOrderOnChainAsLender(orderHash, {from: lender2});
        });

        it("shouldn't allow stranger to transfer ownership of lender's loan", async () => {
            try {
                assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: strangerLender}));
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should allow lender to transfer ownership of his own loan", async () => {
            assert.isTrue(await bZx.changeLenderOwnership.call(orderHash, strangerLender, {from: lender2}));
        });

        it("should transfer ownership on owner's request", async () => {
            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 0);
            assert.equal(await countOrdersForUser(lender2), 1);

            await bZx.changeLenderOwnership(orderHash, strangerLender, {from: lender2});

            assert.equal(await countOrdersForUser(order["makerAddress"]), 1);
            assert.equal(await countOrdersForUser(strangerLender), 1);
            assert.equal(await countOrdersForUser(lender2), 0);
        });

        after("clean up", async () => {
            await reverter.revert();
        });
    });

    function toHex(d) {
        return ("0" + Number(d).toString(16)).slice(-2).toUpperCase();
    }

    let ordersForUser = async (user) => {
        return decodeOrders(await bZx.getOrdersForUser.call(user, 0, 10));
    }

    let countOrdersForUser = async (user) => {
        let orders = await ordersForUser(user);
        return orders ? orders.length : 0;
    }

    function decodeOrders(data) {
        if (!data) {
            return [];
        }

        data = data.substr(2); // remove 0x from front
        const itemCount = 20;
        const objCount = data.length / 64 / itemCount;

        assert.isTrue(objCount % 1 == 0);

        var orderObjArray = data.match(
            new RegExp(".{1," + itemCount * 64 + "}", "g")
        );
        if (!orderObjArray) {
            return [];
        }

        var result = [];

        for (var i = 0; i < orderObjArray.length; i++) {
            var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
            result.push({
                maker: "0x" + params[0].substr(24),
                loanTokenAddress: "0x" + params[1].substr(24),
                interestTokenAddress: "0x" + params[2].substr(24),
                collateralTokenAddress: "0x" + params[3].substr(24),
                feeRecipientAddress: "0x" + params[4].substr(24),
                oracleAddress: "0x" + params[5].substr(24),
                loanTokenAmount: parseInt("0x" + params[6]),
                interestAmount: parseInt("0x" + params[7]),
                initialMarginAmount: parseInt("0x" + params[8]),
                maintenanceMarginAmount: parseInt("0x" + params[9]),
                lenderRelayFee: parseInt("0x" + params[10]),
                traderRelayFee: parseInt("0x" + params[11]),
                maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
                expirationUnixTimestampSec: parseInt("0x" + params[13]),
                loanOrderHash: "0x" + params[14],
                lender: "0x" + params[15].substr(24),
                orderFilledAmount: parseInt("0x" + params[16]),
                orderCancelledAmount: parseInt("0x" + params[17]),
                orderTraderCount: parseInt("0x" + params[18]),
                addedUnixTimestampSec: parseInt("0x" + params[19])
            });
        }

        return result;
    }

    let sign = async (signer, data) => {
        let signature = web3.eth.sign(signer, data) + toHex(SignatureType.EthSign);
        assert.isOk(await bZx.isValidSignature.call(signer, data, signature));
        return signature;
    };

    let orderAddresses = (order) => {
        return [
            order["makerAddress"],
            order["loanTokenAddress"],
            order["interestTokenAddress"],
            order["collateralTokenAddress"],
            order["feeRecipientAddress"],
            order["oracleAddress"]
        ]
    }

    let orderValues = (order) => {
        return [
            new BN(order["loanTokenAmount"]),
            new BN(order["interestAmount"]),
            new BN(order["initialMarginAmount"]),
            new BN(order["maintenanceMarginAmount"]),
            new BN(order["lenderRelayFee"]),
            new BN(order["traderRelayFee"]),
            new BN(order["maxDurationUnixTimestampSec"]),
            new BN(order["expirationUnixTimestampSec"]),
            new BN(order["makerRole"]),
            new BN(order["salt"])
        ]
    }

    let generateLenderOrder = () => {
        let lenderOrder = {
            bZxAddress: bZx.address,
            makerAddress: trader2, // lender
            loanTokenAddress: loanToken2.address,
            interestTokenAddress: interestToken2.address,
            collateralTokenAddress: collateralToken2.address,
            feeRecipientAddress: utils.zeroAddress,
            oracleAddress: oracle.address,
            loanTokenAmount: web3.toWei(100000, "ether").toString(),
            interestAmount: web3.toWei(2, "ether").toString(), // 2 token units per day
            initialMarginAmount: "50", // 50%
            maintenanceMarginAmount: "25", // 25%
            lenderRelayFee: web3.toWei(0.001, "ether").toString(),
            traderRelayFee: web3.toWei(0.0015, "ether").toString(),
            maxDurationUnixTimestampSec: "2419200", // 28 days
            expirationUnixTimestampSec: (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            makerRole: "1", // 0=lender, 1=trader
            salt: generatePseudoRandomSalt().toString()
        }

        return lenderOrder;
    }

    let generateTraderOrder = () => {
        let traderOrder = {
            bZxAddress: bZx.address,
            makerAddress: lender1, // lender
            loanTokenAddress: loanToken1.address,
            interestTokenAddress: interestToken1.address,
            collateralTokenAddress: utils.zeroAddress,
            feeRecipientAddress: utils.zeroAddress,
            oracleAddress: oracle.address,
            loanTokenAmount: web3.toWei(100000, "ether").toString(),
            interestAmount: web3.toWei(2, "ether").toString(), // 2 token units per day
            initialMarginAmount: "50", // 50%
            maintenanceMarginAmount: "5", // 25%
            lenderRelayFee: web3.toWei(0.001, "ether").toString(),
            traderRelayFee: web3.toWei(0.0015, "ether").toString(),
            maxDurationUnixTimestampSec: "2419200", // 28 days
            expirationUnixTimestampSec: (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            makerRole: "0", // 0=lender, 1=trader
            salt: generatePseudoRandomSalt().toString()
        }

        return traderOrder;
    }
});
