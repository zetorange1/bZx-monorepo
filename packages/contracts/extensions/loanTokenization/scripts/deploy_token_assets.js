
// This script should be called with: truffle exec ./deploy_token_assets.js --network ropsten

const isDisabled = false;

let argv = require("minimist")(process.argv.slice(2));
let network = argv["network"];
if (network === undefined) {
  network = "development";
}

const secrets = require("../../../../../../config/secrets.js");
const fs = require("fs");
if (!secrets["assets_path"] || !fs.existsSync(secrets["assets_path"])) {
  console.log(secrets["assets_path"]+" not found");
  process.exit();
}

const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const web3utils = require("web3-utils");

const TokenizedRegistry = artifacts.require("TokenizedRegistry");
const ReferencePriceFeed = artifacts.require("ReferencePriceFeed");

const EtherLoanTokenLogic = artifacts.require("EtherLoanTokenLogic"); // includes LoanTokenLogic
const PositionTokenLogic = artifacts.require("PositionTokenLogic");

module.exports = async function(callback) {

  if (isDisabled) {
    console.log("Script disabled!");
    process.exit();
  }

  if (!secrets["assets_path"] || !fs.existsSync(secrets["assets_path"])) {
    console.log(secrets["assets_path"]+" not found");
    process.exit();
  }
  
  try {
    await (new Promise((resolve) => rimraf(secrets["assets_path"]+network, resolve)));
  } catch (e) {console.log(e)}
  await mkdirp.sync(secrets["assets_path"]+network);

  // process TokenizedRegistry
  await processArtifacts("TokenizedRegistry", TokenizedRegistry.address, TokenizedRegistry.abi);

  // process ReferencePriceFeed
  await processArtifacts("ReferencePriceFeed", ReferencePriceFeed.address, ReferencePriceFeed.abi);

  // process iToken
  await processArtifacts("iToken", "", EtherLoanTokenLogic.abi);

  // process pToken
  await processArtifacts("pToken", "", PositionTokenLogic.abi);

  await callback();
};

function processArtifacts(name, address, abi) {
  try {
    // sort ABI by name field
    abi.sort(function(a, b) {
      return a.name > b.name ? 1 : b.name > a.name ? -1 : 0;
    });

    let jsonAsset = {
      name: name,
      address: address ? web3utils.toChecksumAddress(address) : "",
      abi: abi
    };

    fs.writeFileSync(
      secrets["assets_path"]+network+"/" + name + ".json",
      JSON.stringify(jsonAsset),
      function(err) {
        if (err) {
          console.log(name + ".json Error: " + err);
        }
      }
    );
  } catch (err) {
    console.log(name + ".json Error: " + err);
  }
}
