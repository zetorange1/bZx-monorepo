const BZxVault = artifacts.require("BZxVault");
const TestToken0 = artifacts.require("TestToken0");

const utils = require('./utils/utils.js');
const Reverter = require('./utils/reverter');

contract('BZxVault', function (accounts) {
    let reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    let vault;
    let token;
    let owner = accounts[0];
    let bzx = accounts[1];
    let stranger = accounts[2];

    before('before', async () => {
        vault = await BZxVault.new();
        await vault.transferBZxOwnership(bzx);

        token = await TestToken0.new();

        await reverter.snapshot();
    })

    after("after", async () => {
    })

    it('should accept ETH only from bzx', async () => {
        const VALUE = 1;

        const initialBalance = web3.eth.getBalance(vault.address);
        let balance;

        await vault.sendTransaction({value:VALUE, from:bzx});
        balance = web3.eth.getBalance(vault.address);

        assert.isTrue(balance.eq(initialBalance.add(VALUE)));

        try {
            await vault.sendTransaction({value:VALUE, from:owner});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        try {
            await vault.sendTransaction({value:VALUE, from:stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        assert.isTrue(web3.eth.getBalance(vault.address).eq(initialBalance.add(VALUE)));
    });

    it('should allow bzx to withdraw deposited ETH', async () => {
        const VALUE = 1;
        assert.isTrue(web3.eth.getBalance(vault.address).isZero());

        await vault.sendTransaction({from: bzx, value:VALUE});
        assert.isTrue(web3.eth.getBalance(vault.address).eq(VALUE));

        try {
            await vault.withdrawEther(owner, VALUE, {from: stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        await vault.withdrawEther(owner, VALUE, {from: bzx});
        assert.isTrue(web3.eth.getBalance(vault.address).isZero());
    });

    it('should allow partial withdraw deposited ETH', async () => {
        const DEPOSITED_VALUE = 2;
        const VALUE = 1;

        assert.isTrue(web3.eth.getBalance(vault.address).isZero());

        await vault.sendTransaction({from: bzx, value:DEPOSITED_VALUE});
        assert.isTrue(web3.eth.getBalance(vault.address).eq(DEPOSITED_VALUE));

        try {
            await vault.withdrawEther(owner, VALUE, {from: stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        await vault.withdrawEther(owner, VALUE, {from: bzx});
        assert.isTrue(web3.eth.getBalance(vault.address).eq(DEPOSITED_VALUE-VALUE));

        await vault.withdrawEther(owner, DEPOSITED_VALUE, {from: bzx});
        assert.isTrue(web3.eth.getBalance(vault.address).isZero());
    });

    it('should allow bzx to deposit tokens', async () => {
        const VALUE = 100;

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());

        await token.approve(vault.address, VALUE, {from: owner});

        try {
            await vault.depositToken(token.address, owner, VALUE, {from: stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        await vault.depositToken(token.address, owner, VALUE, {from: bzx});

        assert.isTrue((await token.balanceOf(vault.address)).eq(VALUE));
    });

    it('should allow bzx do multiple token deposits', async () => {
        const VALUE = 100;

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());

        await token.approve(vault.address, VALUE, {from: owner});

        assert.isFalse(await vault.depositToken.call(token.address, owner, 0, {from: bzx}));
        assert.isTrue(await vault.depositToken.call(token.address, owner, VALUE/4, {from: bzx}));

        await vault.depositToken(token.address, owner, VALUE/4, {from: bzx});
        await vault.depositToken(token.address, owner, VALUE/4, {from: bzx});
        await vault.depositToken(token.address, owner, VALUE/4, {from: bzx});
        await vault.depositToken(token.address, owner, VALUE/4, {from: bzx});

        assert.isTrue((await token.balanceOf(vault.address)).eq(VALUE));
    });

    it('should allow bzx to withdraw tokens', async () => {
        const VALUE = 100;

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());

        await token.approve(vault.address, VALUE, {from: owner});
        await vault.depositToken(token.address, owner, VALUE, {from: bzx});

        try {
            await vault.withdrawToken(token.address, stranger, VALUE, {from: stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        await vault.withdrawToken(token.address, bzx, VALUE, {from: bzx});

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).eq(VALUE));
    });

    it('should allow bzx to partial withdraw tokens', async () => {
        const VALUE = 100;

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());

        await token.approve(vault.address, VALUE, {from: owner});
        await vault.depositToken(token.address, owner, VALUE, {from: bzx});

        assert.isFalse(await vault.withdrawToken.call(token.address, bzx, 0, {from: bzx}));
        assert.isTrue(await vault.withdrawToken.call(token.address, bzx, VALUE/4, {from: bzx}));

        await vault.withdrawToken(token.address, bzx, VALUE/4, {from: bzx});
        await vault.withdrawToken(token.address, bzx, VALUE/4, {from: bzx});
        await vault.withdrawToken(token.address, bzx, VALUE/4, {from: bzx});
        await vault.withdrawToken(token.address, bzx, VALUE/4, {from: bzx});

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).eq(VALUE));
    });

    it('should allow transfer tokens', async () => {
        const VALUE = 100;

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());

        await token.approve(vault.address, VALUE, {from: owner});
        try{
            await vault.transferTokenFrom(token.address, owner, stranger, VALUE, {from: stranger});
            assert.isTrue(false);
        } catch (e) {
            utils.ensureException(e);
        }

        assert.isFalse(await vault.transferTokenFrom.call(token.address, owner, stranger, 0, {from: bzx}));
        assert.isTrue(await vault.transferTokenFrom.call(token.address, owner, stranger, VALUE, {from: bzx}));

        await vault.transferTokenFrom(token.address, owner, stranger, VALUE, {from: bzx});

        assert.isTrue((await token.balanceOf(vault.address)).isZero());
        assert.isTrue((await token.balanceOf(bzx)).isZero());
        assert.isTrue((await token.balanceOf(stranger)).eq(VALUE));
    });
});
