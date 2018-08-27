const TokenRegistry = artifacts.require("TokenRegistry");
const TestToken1 = artifacts.require("TestToken1");
const TestToken2 = artifacts.require("TestToken2");
const TestToken3 = artifacts.require("TestToken3");

const utils = require("./utils/utils.js");
const Reverter = require("./utils/reverter");
const BigNumber = require("bignumber.js");
const _ = require("underscore");

contract("TokenRegistry", function(accounts) {
  let reverter = new Reverter(web3);

  let tokenRegistry;
  const owner = accounts[0];
  const bzx = accounts[1];
  const stranger = accounts[2];
  let token1;
  let token2;
  let token3;

  before("before", async () => {
    tokenRegistry = await TokenRegistry.new();

    token1 = await TestToken1.new();
    token2 = await TestToken2.new();
    token3 = await TestToken3.new();

    await reverter.snapshot();
  });

  after("after", async () => {});

  context("Register", async () => {
    let NAME;
    let SYMBOL;
    let DECIMALS;

    before("before", async () => {
      NAME = await token1.name.call();
      SYMBOL = await token1.symbol.call();
      DECIMALS = await token1.decimals.call();
    });

    it("shouldn't allow stranger to add token", async () => {
      try {
        await tokenRegistry.addToken(
          token1.address,
          NAME,
          SYMBOL,
          DECIMALS,
          "uri",
          { from: stranger }
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("should allow owner to add token", async () => {
      await tokenRegistry.addToken(
        token1.address,
        NAME,
        SYMBOL,
        DECIMALS,
        "uri"
      );
      await ensureTokenExists(token1.address, NAME, SYMBOL, DECIMALS, "uri");
    });

    it("shouldn't allow owner to register the same token (address/name/symbol) twice", async () => {
      let name2 = await token2.name.call();
      let symbol2 = await token2.symbol.call();
      let decimals2 = await token2.decimals.call();

      try {
        await tokenRegistry.addToken(
          token1.address,
          name2,
          symbol2,
          decimals2,
          "uri2"
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      try {
        await tokenRegistry.addToken(
          token2.address,
          NAME,
          symbol2,
          decimals2,
          "uri2"
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      try {
        await tokenRegistry.addToken(
          token2.address,
          name2,
          SYMBOL,
          decimals2,
          "uri2"
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await tokenRegistry.addToken(
        token2.address,
        name2,
        symbol2,
        decimals2,
        "uri2"
      );
      await ensureTokenExists(
        token2.address,
        name2,
        symbol2,
        decimals2,
        "uri2"
      );
    });

    it("shouldn't allow owner to register 0x0 address", async () => {
      let name3 = await token3.name.call();
      let symbol3 = await token3.symbol.call();
      let decimals3 = await token3.decimals.call();

      try {
        await tokenRegistry.addToken(0x0, name3, symbol3, decimals3, "uri3");
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await tokenRegistry.addToken(
        token3.address,
        name3,
        symbol3,
        decimals3,
        "uri3"
      );
      await ensureTokenExists(
        token3.address,
        name3,
        symbol3,
        decimals3,
        "uri3"
      );
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Remove", async () => {
    let NAME1;
    let SYMBOL1;
    let DECIMALS1;
    let URI1;

    let NAME2;
    let SYMBOL2;
    let DECIMALS2;
    let URI2;

    before("before", async () => {
      NAME1 = await token1.name.call();
      SYMBOL1 = await token1.symbol.call();
      DECIMALS1 = await token1.decimals.call();
      URI1 = "uri1";

      NAME2 = await token2.name.call();
      SYMBOL2 = await token2.symbol.call();
      DECIMALS2 = await token2.decimals.call();
      URI2 = "uri2";

      await tokenRegistry.addToken(
        token1.address,
        NAME1,
        SYMBOL1,
        DECIMALS1,
        URI1
      );
      await tokenRegistry.addToken(
        token2.address,
        NAME2,
        SYMBOL2,
        DECIMALS2,
        URI2
      );
    });

    it("shouldn't allow owner to remove token with invalid index", async () => {
      let index = await getTokenIndex(token1.address);

      try {
        await tokenRegistry.removeToken(token1.address, index + 1);
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("shouldn't allow stranger to remove token", async () => {
      let index = await getTokenIndex(token1.address);

      try {
        await tokenRegistry.removeToken(token1.address, index, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("should allow owner to remove token with valid index", async () => {
      let index = await getTokenIndex(token1.address);
      await tokenRegistry.removeToken(token1.address, index);

      await ensureTokenDoesNotExist(token1.address, NAME1, SYMBOL1);
    });

    it("should fail if token does not exist", async () => {
      let index = await getTokenIndex(token2.address);

      try {
        let tx = await tokenRegistry.removeToken(token3.address, index);
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Alter", async () => {
    let NAME1;
    let SYMBOL1;
    let DECIMALS1;
    let URI1;

    let NAME2;
    let SYMBOL2;
    let DECIMALS2;
    let URI2;

    let NAME_UPD = "new name";
    let SYMBOL_UPD = "new symbol";
    let URI_UPD = "new uri";

    before("before", async () => {
      NAME1 = await token1.name.call();
      SYMBOL1 = await token1.symbol.call();
      DECIMALS1 = await token1.decimals.call();
      URI1 = "uri1";

      NAME2 = await token2.name.call();
      SYMBOL2 = await token2.symbol.call();
      DECIMALS2 = await token2.decimals.call();
      URI2 = "uri2";

      await tokenRegistry.addToken(
        token1.address,
        NAME1,
        SYMBOL1,
        DECIMALS1,
        URI1
      );
      await tokenRegistry.addToken(
        token2.address,
        NAME2,
        SYMBOL2,
        DECIMALS2,
        URI1
      );
    });

    it("should allow owner to update token's symbol", async () => {
      try {
        await tokenRegistry.setTokenSymbol(token1.address, SYMBOL_UPD, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await ensureTokenExists(token1.address, NAME1, SYMBOL1, DECIMALS1, URI1);

      await tokenRegistry.setTokenSymbol(token1.address, SYMBOL_UPD);
      await ensureTokenExists(
        token1.address,
        NAME1,
        SYMBOL_UPD,
        DECIMALS1,
        URI1
      );
    });

    it("should allow owner to update token's name", async () => {
      try {
        await tokenRegistry.setTokenName(token1.address, NAME_UPD, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await ensureTokenExists(
        token1.address,
        NAME1,
        SYMBOL_UPD,
        DECIMALS1,
        URI1
      );

      await tokenRegistry.setTokenName(token1.address, NAME_UPD);
      await ensureTokenExists(
        token1.address,
        NAME_UPD,
        SYMBOL_UPD,
        DECIMALS1,
        URI1
      );
    });

    it("should allow owner to update token's uri", async () => {
      try {
        await tokenRegistry.setTokenURL(token1.address, URI_UPD, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await ensureTokenExists(
        token1.address,
        NAME_UPD,
        SYMBOL_UPD,
        DECIMALS1,
        URI1
      );

      await tokenRegistry.setTokenURL(token1.address, URI_UPD);
      await ensureTokenExists(
        token1.address,
        NAME_UPD,
        SYMBOL_UPD,
        DECIMALS1,
        URI_UPD
      );
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Token list consistency", async () => {
    it("should always has consistent token list", async () => {
      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 0);

      await tokenRegistry.addToken(
        token1.address,
        "NAME1",
        "SYMBOL1",
        8,
        "URI1"
      );
      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 1);

      await tokenRegistry.addToken(
        token2.address,
        "NAME2",
        "SYMBOL2",
        8,
        "URI2"
      );
      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 2);

      await removeToken(token1.address);
      await ensureTokenDoesNotExist(token1.address, "NAME1", "SYMBOL1");
      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 1);

      await tokenRegistry.addToken(
        token1.address,
        "NAME1",
        "SYMBOL1",
        8,
        "URI1"
      );
      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 2);

      await removeToken(token1.address);
      await removeToken(token2.address);

      await ensureTokenDoesNotExist(token1.address, "NAME1", "SYMBOL1");
      await ensureTokenDoesNotExist(token2.address, "NAME2", "SYMBOL2");

      assert.equal((await tokenRegistry.getTokenAddresses.call()).length, 0);
    });

    after(async () => {
      await reverter.revert();
    });
  });

  let ensureTokenExists = async (address, name, symbol, decimals, uri) => {
    assert.equal(
      address,
      await tokenRegistry.getTokenAddressBySymbol.call(symbol)
    );
    assert.equal(address, await tokenRegistry.getTokenAddressByName.call(name));

    let tokenMetadata = await tokenRegistry.getTokenMetaData.call(address);
    assert.equal(tokenMetadata[0], address);
    assert.equal(tokenMetadata[1], name);
    assert.equal(tokenMetadata[2], symbol);
    assert.isTrue(tokenMetadata[3].eq(decimals));
    assert.equal(tokenMetadata[4], uri);

    tokenMetadata = await tokenRegistry.getTokenByName.call(name);
    assert.equal(tokenMetadata[0], address);
    assert.equal(tokenMetadata[1], name);
    assert.equal(tokenMetadata[2], symbol);
    assert.isTrue(tokenMetadata[3].eq(decimals));
    assert.equal(tokenMetadata[4], uri);

    tokenMetadata = await tokenRegistry.getTokenBySymbol.call(symbol);
    assert.equal(tokenMetadata[0], address);
    assert.equal(tokenMetadata[1], name);
    assert.equal(tokenMetadata[2], symbol);
    assert.isTrue(tokenMetadata[3].eq(decimals));
    assert.equal(tokenMetadata[4], uri);
  };

  let ensureTokenDoesNotExist = async (address, name, symbol) => {
    assert.equal(
      utils.zeroAddress,
      await tokenRegistry.getTokenAddressBySymbol.call(symbol)
    );
    assert.equal(
      utils.zeroAddress,
      await tokenRegistry.getTokenAddressByName.call(name)
    );

    let tokenMetadata = await tokenRegistry.getTokenMetaData.call(address);
    assert.equal(tokenMetadata[0], utils.zeroAddress);
    assert.equal(tokenMetadata[1], "");
    assert.equal(tokenMetadata[2], "");
    assert.isTrue(tokenMetadata[3].isZero());
    assert.equal(tokenMetadata[4], "");

    tokenMetadata = await tokenRegistry.getTokenByName.call(name);
    assert.equal(tokenMetadata[0], utils.zeroAddress);
    assert.equal(tokenMetadata[1], "");
    assert.equal(tokenMetadata[2], "");
    assert.isTrue(tokenMetadata[3].isZero());
    assert.equal(tokenMetadata[4], "");

    tokenMetadata = await tokenRegistry.getTokenBySymbol.call(symbol);
    assert.equal(tokenMetadata[0], utils.zeroAddress);
    assert.equal(tokenMetadata[1], "");
    assert.equal(tokenMetadata[2], "");
    assert.isTrue(tokenMetadata[3].isZero());
    assert.equal(tokenMetadata[4], "");
  };

  let getTokenIndex = async token => {
    let tokens = await tokenRegistry.getTokenAddresses.call();
    for (var i = 0; i < tokens.length; i++) {
      if (token == tokens[i]) {
        return i;
      }
    }

    assert.isTrue(false);
  };

  let removeToken = async token => {
    let index = await getTokenIndex(token);
    await tokenRegistry.removeToken(token, index);
  };
});
