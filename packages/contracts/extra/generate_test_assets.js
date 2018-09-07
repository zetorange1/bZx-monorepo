var config = require("../protocol-config.js");

var fs = require("fs");
var mkdirp = require("mkdirp");

var web3utils = require("web3-utils");

if (!fs.existsSync("./html_public_test")) {
  mkdirp.sync("./html_public_test");
  proceed();
} else {
  var rimraf = require("rimraf");
  rimraf("./html_public_test", function() {
    //console.log('done');
    mkdirp.sync("./html_public_test");
    proceed();
  });
}

function proceed() {
  if (!fs.existsSync("./html_public_test/abi")) {
    mkdirp.sync("./html_public_test/abi");
  }
  if (!fs.existsSync("./html_public_test/deployed")) {
    mkdirp.sync("./html_public_test/deployed");
  }

  var addresses = {
    BZx: "unknown",
    BZxProxy: "unknown",
    BZxVault: "unknown",
    BZxTo0x: "unknown",
    BZxTo0xV2: "unknown",
    BZxOracle: "unknown",
    BZRxToken: "unknown",
    TokenRegistry: "unknown",
    OracleRegistry: "unknown",
    TestNetFaucet: "unknown"
  };
  var replacements = {};

  var network = "development";
  if (process.argv.length >= 3) {
    network = process.argv[2];
  }

  var addresses_0x = {
    ZRXToken: web3utils.toChecksumAddress(
      config["addresses"][network]["ZeroEx"]["ZRXToken"]
    ),
    WETH:
      config["addresses"][network]["ZeroEx"]["WETH9"] != ""
        ? web3utils.toChecksumAddress(
            config["addresses"][network]["ZeroEx"]["WETH9"]
          )
        : web3utils.toChecksumAddress(
            config["addresses"][network]["ZeroEx"]["EtherToken"]
          )
  };
  var abis_0x = {
    ZRXToken: "[]",
    WETH:
      '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]'
  };

  if (network != "mainnet") {
    if (network != "ropsten") {
      for (var i = 0; i <= 9; i++) {
        addresses["TestToken" + i] = "unknown";
      }
      replacements["BZxOracle"] = "TestNetOracle";
      if (network == "development") {
        replacements["BZRxToken"] = "TestNetBZRxToken";
      }
    }
  } else {
    delete addresses["TestNetFaucet"];
    addresses["BZRXFakeFaucet"] = "unknown";
  }

  addresses["OracleInterface"] = "unknown";
  addresses["EIP20"] = "unknown";

  if (config["addresses"][network]["MultiSig"]) {
    addresses["MultiSig"] = web3utils.toChecksumAddress(
      config["addresses"][network]["MultiSig"]
    );
    replacements["MultiSig"] = "MultiSigWalletWithCustomTimeLocks";
  }

  var networkId;
  switch (network) {
    case "mainnet":
      networkId = 1;
      break;
    case "ropsten":
      networkId = 3;
      break;
    case "kovan":
      networkId = 42;
      break;
    case "rinkeby":
      networkId = 4;
      break;
    default:
      networkId = 50;
  }

  var jsonContents = {};
  Object.keys(addresses).forEach(function(item, index) {
    var contents = fs.readFileSync(
      "./build/contracts/" +
        (replacements[item] !== undefined ? replacements[item] : item) +
        ".json"
    );
    var jsonContent = JSON.parse(contents);

    try {
      if (item == "BZxProxy") {
        if (!jsonContents["BZx"]) {
          jsonContents["BZx"] = {};
        }
        jsonContents["BZx"]["networks"] = jsonContent["networks"];
        delete addresses[item];
        return;
      } else if (item == "BZx") {
        if (!jsonContents["BZx"]) {
          jsonContents["BZx"] = {};
        }
        jsonContents["BZx"]["abi"] = jsonContent["abi"];
        return;
      }

      jsonContents[item] = jsonContent;
    } catch (err) {
      console.log(item + ".json Error: " + err);
    }
  });

  var MEWAssets = [
    {
      name: "Select a contract...",
      address: "",
      abi: " "
    }
  ];

  Object.keys(addresses).forEach(function(item, index) {
    var jsonContent = jsonContents[item];

    var abi = "[]";
    try {
      if (addresses[item] == "unknown") addresses[item] = "";
      if (jsonContent["networks"][networkId])
        addresses[item] = web3utils.toChecksumAddress(
          jsonContent["networks"][networkId]["address"]
        );

      // sort ABI by name field
      jsonContent["abi"].sort(function(a, b) {
        return a.name > b.name ? 1 : b.name > a.name ? -1 : 0;
      });

      var jsonAsset = {
        name: item,
        address: addresses[item],
        abi: jsonContent["abi"]
      };

      abi = JSON.stringify(jsonContent["abi"], null, "\t");

      fs.writeFileSync(
        "./html_public_test/deployed/" + item + ".json",
        JSON.stringify(jsonAsset),
        function(err) {
          if (err) {
            console.log(item + ".json Error: " + err);
          }
        }
      );

      if (
        jsonAsset["name"] &&
        jsonAsset["address"] &&
        (jsonAsset["abi"] !== undefined || jsonAsset["abi"].length > 0)
      ) {
        MEWAssets.push({
          name: item,
          address: addresses[item],
          abi: JSON.stringify(jsonContent["abi"])
        });
      }
    } catch (err) {
      console.log(item + ".json Error: " + err);
    }

    if (abi != "[]") {
      /*console.log("address:", address);
		console.log("abi:", abi);*/
      fs.writeFile(
        "./html_public_test/abi/" + item + ".abi.json",
        abi,
        function(err) {
          if (err) {
            console.log(item + ".json Error: " + err);
          }
        }
      );
    }
  });

  fs.writeFileSync(
    "./html_public_test/mew_" + network + ".json",
    JSON.stringify(MEWAssets),
    function(err) {
      if (err) {
        console.log(item + ".json Error: " + err);
      }
    }
  );

  var abiIndex = `

<!DOCTYPE html>
<html>
	<head>
		<title>bZx Test Network</title>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		</head>
	<body>
		<pre style="white-space: pre-wrap; white-space: -moz-pre-wrap; white-space: -pre-wrap; white-space: -o-pre-wrap; word-wrap: break-word;">
		<font size="4" face="Courier New">
<a href="../">..</a>
`;

  Object.keys(addresses).forEach(function(item, index) {
    abiIndex +=
      `<a href="` +
      item +
      `.abi.json">` +
      item +
      ` ABI</a>
`;
  });

  abiIndex += `
		</font>
		</pre>
	</body>
</html>
`;

  fs.writeFile("./html_public_test/abi/index.html", abiIndex, function(err) {
    if (err) {
      console.err("Error: " + err);
    }
  });

  var outHTML = `
<!DOCTYPE html>
<html>
	<head>
		<title>bZx Test Network</title>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		</head>
	<body>
		<pre style="white-space: pre-wrap; white-space: -moz-pre-wrap; white-space: -pre-wrap; white-space: -o-pre-wrap; word-wrap: break-word;">
		<font size="2" face="Courier New">

Smart Contracts
==================
`;

  let fqdn = "";
  if (network !== `mainnet`) {
    fqdn = network + `.etherscan.io`;
  } else {
    fqdn = `etherscan.io`;
  }

  Object.keys(addresses).forEach(function(item, index) {
    if (addresses[item] == "") {
      addresses[item] = "[abi only]";
      outHTML +=
        item +
        ` :: ` +
        addresses[item] +
        ` <a href="abi/` +
        item +
        `.abi.json" target="_blank">abi</a>
`;
    } else {
      outHTML +=
        item +
        ` :: <a href="https://` +
        fqdn +
        `/address/` +
        addresses[item] +
        `" target="_blank">` +
        addresses[item] +
        `</a> <a href="abi/` +
        item +
        `.abi.json" target="_blank">abi</a>
`;
    }
  });

  outHTML += `

`;
  Object.keys(addresses_0x).forEach(function(item, index) {
    if (abis_0x[item] != "[]") {
      outHTML +=
        item +
        " :: " +
        `<a href="https://` +
        fqdn +
        `/address/` +
        addresses_0x[item] +
        `" target="_blank">` +
        addresses_0x[item] +
        `</a>` +
        ' <a href="abi/' +
        item +
        '.abi.json" target="_blank">abi</a>\n';
    } else {
      outHTML +=
        item +
        " :: " +
        `<a href="https://` +
        fqdn +
        `/address/` +
        addresses_0x[item] +
        `" target="_blank">` +
        addresses_0x[item] +
        `</a>` +
        "\n";
    }
  });
  outHTML += `

		</font>
		</pre>
	</body>
</html>`;

  fs.writeFile("./html_public_test/index.html", outHTML, function(err) {
    if (err) {
      console.err("Error: " + err);
    }
  });

  Object.keys(abis_0x).forEach(function(item, index) {
    if (abis_0x[item] != "[]") {
      fs.writeFile(
        "./html_public_test/abi/" + item + ".abi.json",
        JSON.stringify(JSON.parse(abis_0x[item]), null, "\t"),
        function(err) {
          if (err) {
            console.log(item + ".json Error: " + err);
          }
        }
      );
    }
    fs.writeFileSync(
      "./html_public_test/deployed/" + item + ".json",
      JSON.stringify({
        name: item,
        address: addresses_0x[item],
        abi: JSON.parse(abis_0x[item])
      }),
      function(err) {
        if (err) {
          console.log(item + ".json Error: " + err);
        }
      }
    );
  });
}
