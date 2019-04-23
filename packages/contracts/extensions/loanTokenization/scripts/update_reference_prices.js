
// This script should be called with: truffle exec ./update_reference_prices.js --network kovan

let argv = require("minimist")(process.argv.slice(2));
let network = argv["network"];
if (network === undefined) {
  network = "development";
}

if (network === "development") {
  console.log("Development network not supported!");
  process.exit();
}

let priceFeedContract = {
  mainnet: "",
  ropsten: "0x207056a6acB2727F834C9Bc987722B08628e5943",
  rinkeby: "",
  kovan: "0x325946B0ed8c5993E36BfCA1f218E22c2b10adf9",
};

let assets = {
  mainnet: [],
  ropsten: [
    "0xc778417e063141139fce010982780140aa0cd5ab", // WETH
  ],
  rinkeby: [],
  kovan: [
    "0xd0a1e359811322d97991e03f863a0c30c2cf029c", // WETH
  ],
};

const ReferencePriceFeed = artifacts.require("ReferencePriceFeed");

const timestamp = "0"; // 0 for latest

module.exports = async function(callback) {
  let priceFeed
  if (!priceFeedContract[network]) {
    if (network === "development") {
      priceFeed = await ReferencePriceFeed.deployed();
    } else {
      console.log("ReferencePriceFeed not found!");
      process.exit();
    }
  } else {
    priceFeed = await ReferencePriceFeed.at(priceFeedContract[network]);
  }

  if (!assets[network]) {
    console.log("No assets defined for this network!");
    process.exit();
  }

  await priceFeed.setPricesByKyber(
    assets[network],
    timestamp
  );
  console.log("Price update complete.");

  await callback();
};
