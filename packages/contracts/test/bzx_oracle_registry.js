const OracleRegistry = artifacts.require("OracleRegistry");
const TestToken0 = artifacts.require("TestToken0");

const utils = require("./utils/utils.js");
const Reverter = require("./utils/reverter");
const BigNumber = require("bignumber.js");
const _ = require("underscore");

contract("OracleRegistry", function(accounts) {
  let reverter = new Reverter(web3);

  let oracleRegistry;
  const owner = accounts[0];
  const bzx = accounts[1];
  const stranger = accounts[2];
  const oracle1 = accounts[3];
  const oracle2 = accounts[4];
  const oracle3 = accounts[5];
  const oracle4 = accounts[6];

  before("before", async () => {
    oracleRegistry = await OracleRegistry.new();
    await reverter.snapshot();
  });

  after("after", async () => {});

  context("Register", async () => {
    it("should allow owner to register oracle", async () => {
      await oracleRegistry.addOracle(oracle1, "oracle1");
      await ensureOracleExists(oracle1, "oracle1");
    });

    it("shouldn't allow owner to register the same oracle twice", async () => {
      try {
        await oracleRegistry.addOracle(oracle1, "oracle1");
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("shouldn't allow stranger to register oracle", async () => {
      try {
        await oracleRegistry.addOracle(oracle2, "oracle2", { from: stranger });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await oracleRegistry.addOracle(oracle2, "oracle2");
      await ensureOracleExists(oracle2, "oracle2");
    });

    it("shouldn't allow owner to register empty address/name", async () => {
      try {
        await oracleRegistry.addOracle(oracle3, "");
      } catch (e) {
        utils.ensureException(e);
      }

      try {
        await oracleRegistry.addOracle(0x0, "some_name");
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Remove", async () => {
    before("before", async () => {
      await oracleRegistry.addOracle(oracle1, "oracle1");
      await oracleRegistry.addOracle(oracle2, "oracle2");
      await oracleRegistry.addOracle(oracle3, "oracle3");
    });

    it("shouldn't allow owner to remove oracle with invalid index", async () => {
      try {
        await oracleRegistry.removeOracle(oracle1, 3);
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await ensureOracleExists(oracle1, "oracle1");
    });

    it("should allow owner to remove oracle with valid index", async () => {
      await oracleRegistry.removeOracle(oracle1, 0);
      await ensureOracleDoesNotExist(oracle1, "oracle1");
    });

    it("should fail if oracle does not exist", async () => {
      await ensureOracleDoesNotExist(oracle1, "oracle1");

      try {
        await oracleRegistry.removeOracle(oracle1, 0);
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("shouldn't allow stranger to remove oracle", async () => {
      let oracleIndex = await getOracleIndex(oracle3);

      try {
        await oracleRegistry.removeOracle(oracle3, oracleIndex, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await ensureOracleExists(oracle3, "oracle3");

      await oracleRegistry.removeOracle(oracle3, oracleIndex);
      await ensureOracleDoesNotExist(oracle3, "oracle3");
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Alter", async () => {
    before("before", async () => {
      await oracleRegistry.addOracle(oracle1, "oracle1");
      await oracleRegistry.addOracle(oracle2, "oracle2");
      await oracleRegistry.addOracle(oracle3, "oracle3");
    });

    it("should allow owner to update oracle's name", async () => {
      await oracleRegistry.setOracleName(oracle1, "oracle1_upd1");
      await ensureOracleExists(oracle1, "oracle1_upd1");
    });

    it("shouldn't allow stranger to update oracle's name", async () => {
      try {
        await oracleRegistry.setOracleName(oracle2, "oracle2_upd1", {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
      await ensureOracleExists(oracle2, "oracle2");
    });

    it("should fail if oracle does not exist", async () => {
      let unregisteredOracle = accounts[9];
      
      try {        
        await oracleRegistry.setOracleName(unregisteredOracle, "name_upd1");
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
      await ensureOracleDoesNotExist(unregisteredOracle, "name_upd1");
    });

    it("should fail if oracle's name is not unique", async () => {
      try {
        await oracleRegistry.setOracleName(oracle2, "oracle3");
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
      await ensureOracleExists(oracle2, "oracle2");
      await ensureOracleExists(oracle3, "oracle3");
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Oracle list consistency", async () => {
    it("should always has consistent oracle list", async () => {
      assert.equal((await oracleRegistry.getOracleAddresses.call()).length, 0);
      assert.equal((await oracleRegistry.getOracleList.call())[0].length, 0);

      await oracleRegistry.addOracle(oracle1, "oracle1");
      await oracleRegistry.addOracle(oracle2, "oracle2");
      await oracleRegistry.addOracle(oracle3, "oracle3");

      assert.equal((await oracleRegistry.getOracleAddresses.call()).length, 3);
      assert.equal((await oracleRegistry.getOracleList.call())[0].length, 3);

      await removeOracle(oracle2);

      await oracleRegistry.addOracle(oracle4, "oracle4");
      await oracleRegistry.addOracle(oracle2, "oracle2");

      await removeOracle(oracle1);
      await removeOracle(oracle2);
      await removeOracle(oracle3);
      await removeOracle(oracle4);

      assert.equal((await oracleRegistry.getOracleAddresses.call()).length, 0);
      assert.equal((await oracleRegistry.getOracleList.call())[0].length, 0);

      await oracleRegistry.addOracle(oracle4, "oracle4_newname");
      await oracleRegistry.addOracle(oracle2, "oracle2_newname");

      await removeOracle(oracle4);

      assert.equal((await oracleRegistry.getOracleAddresses.call()).length, 1);
      assert.equal((await oracleRegistry.getOracleList.call())[0].length, 1);

      await removeOracle(oracle2);

      assert.equal((await oracleRegistry.getOracleAddresses.call()).length, 0);
      assert.equal((await oracleRegistry.getOracleList.call())[0].length, 0);
    });

    after(async () => {
      await reverter.revert();
    });
  });

  let ensureOracleExists = async (oracle, name) => {
    assert.isTrue(await oracleRegistry.hasOracle.call(oracle));
    assert.equal(
      oracle,
      await oracleRegistry.getOracleAddressByName.call(name)
    );

    let metadata = await oracleRegistry.getOracleMetaData.call(oracle);
    assert.equal(metadata[0], oracle);
    assert.equal(metadata[1], name);

    metadata = await oracleRegistry.getOracleByName.call(name);
    assert.equal(metadata[0], oracle);
    assert.equal(metadata[1], name);

    let oracles = await oracleRegistry.getOracleAddresses.call();
    assert.isTrue(_.contains(oracles, oracle));

    let metadatList = await oracleRegistry.getOracleList.call();
    assert.isTrue(_.contains(metadatList[0], oracle));
    // @ahiatsevich: validate metadatList[1]/metadatList[2]
  };

  let ensureOracleDoesNotExist = async (oracle, name) => {
    assert.isFalse(await oracleRegistry.hasOracle.call(oracle));
    assert.equal(
      utils.zeroAddress,
      await oracleRegistry.getOracleAddressByName.call(name)
    );

    let metadata = await oracleRegistry.getOracleMetaData.call(oracle);
    assert.equal(metadata[0], utils.zeroAddress);
    assert.equal(metadata[1], "");

    metadata = await oracleRegistry.getOracleByName.call(name);
    assert.equal(metadata[0], utils.zeroAddress);
    assert.equal(metadata[1], "");

    let oracles = await oracleRegistry.getOracleAddresses.call();
    assert.isFalse(_.contains(oracles, oracle));
  };

  let getOracleIndex = async oracle => {
    let oracles = await oracleRegistry.getOracleAddresses.call();
    for (var i = 0; i < oracles.length; i++) {
      if (oracle == oracles[i]) {
        return i;
      }
    }

    assert.isTrue(false);
  };

  let removeOracle = async oracle => {
    let oracleIndex = await getOracleIndex(oracle);
    await oracleRegistry.removeOracle(oracle, oracleIndex);
  };
});
