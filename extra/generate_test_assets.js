
var config = require('../../config/secrets.js');

var fs = require("fs");
var mkdirp = require('mkdirp');

const Web3 = require('web3');
let web3 = new Web3();

if (!fs.existsSync("./html_public_test")) {
    mkdirp.sync("./html_public_test");
	proceed();
} else {
	var rimraf = require('rimraf');
	rimraf('./html_public_test', function () {
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
	"B0x": "unknown",
	"B0xProxy": "unknown",
	"B0xVault": "unknown",
	"B0xTo0x": "unknown",
	"B0xOracle": "unknown",
	"B0xToken": "unknown",
	"TokenRegistry": "unknown",
	"OracleRegistry": "unknown",

	"Oracle_Interface": "unknown",
	"EIP20": "unknown",
};

var network = "development";
if (process.argv.length >= 3) {
	network = process.argv[2];
}

var addresses_0x = {
	"ZRXToken": web3.toChecksumAddress(config["protocol"][network]["ZeroEx"]["ZRXToken"]),
	"WETH": config["protocol"][network]["ZeroEx"]["WETH9"] != "" ? web3.toChecksumAddress(config["protocol"][network]["ZeroEx"]["WETH9"]) : web3.toChecksumAddress(config["protocol"][network]["ZeroEx"]["EtherToken"]),
}

if (network == "development") {
	for(var i=0; i <= 9; i++) {
		addresses["TestToken"+i] = "unknown";
	}
}

var networkId;
switch(network) {
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
	var contents = fs.readFileSync("./build/contracts/"+item+".json");
	var jsonContent = JSON.parse(contents);

	try {
		if (item == "B0xProxy") {
			if (!jsonContents["B0x"]) {
				jsonContents["B0x"] = {};
			}
			jsonContents["B0x"]["networks"] = jsonContent["networks"];
			//delete addresses[item];
			//return;
		} else if (item == "B0x") {
			if (!jsonContents["B0x"]) {
				jsonContents["B0x"] = {};
			}
			jsonContents["B0x"]["abi"] = jsonContent["abi"];
			return;
		}

		jsonContents[item] = jsonContent;
	}
	catch(err) {
		console.log(item+".json Error: "+err);
	}
});

var MEWAssets = [{
    "name": "Select a contract...",
    "address": "",
    "abi": ' '
}];

Object.keys(addresses).forEach(function(item, index) {
	var jsonContent = jsonContents[item];

	var abi = "[]";
	try {
		addresses[item] = "";
		if (item != "Oracle_Interface" && item != "EIP20") {
			addresses[item] = web3.toChecksumAddress(jsonContent["networks"][networkId]["address"]);
		}
		
		// sort ABI by name field
		jsonContent["abi"].sort(function(a,b) {return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);} );

		var jsonAsset = {
			"name": item,
			"address": addresses[item],
			"abi": jsonContent["abi"]
		};
		
		abi = JSON.stringify(jsonContent["abi"], null, '\t');

		fs.writeFileSync("./html_public_test/deployed/"+item+".json", JSON.stringify(jsonAsset), function(err) {
			if(err) {
				console.log(item+".json Error: "+err);
			}
		});

		if (jsonAsset["name"] && jsonAsset["address"] && (jsonAsset["abi"] !== undefined || jsonAsset["abi"].length > 0)) {
			MEWAssets.push({
				"name": item,
				"address": addresses[item],
				"abi": JSON.stringify(jsonContent["abi"])
			});
		}
	}
	catch(err) {
		console.log(item+".json Error: "+err);
	}

	if (abi != "[]") {
		/*console.log("address:", address);
		console.log("abi:", abi);*/
		fs.writeFile("./html_public_test/abi/"+item+".abi.json", abi, function(err) {
			if(err) {
				console.log(item+".json Error: "+err);
			}
		});
	}
});

fs.writeFileSync("./html_public_test/mew_"+network+".json", JSON.stringify(MEWAssets), function(err) {
	if(err) {
		console.log(item+".json Error: "+err);
	}
});

var abiIndex = `

<!DOCTYPE html>
<html>
	<head>
		<title>b0x Test Network</title>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		</head>
	<body>
		<pre style="white-space: pre-wrap; white-space: -moz-pre-wrap; white-space: -pre-wrap; white-space: -o-pre-wrap; word-wrap: break-word;">
		<font size="4" face="Courier New">
<a href="../">..</a>
`;

Object.keys(addresses).forEach(function(item, index) {
	abiIndex += `<a href="`+item+`.abi.json">`+item+` ABI</a>
`;
});

abiIndex += `
		</font>
		</pre>
	</body>
</html>
`;

fs.writeFile("./html_public_test/abi/index.html", abiIndex, function(err) {
	if(err) {
		console.err("Error: "+err);
	}
});

var outHTML = `
<!DOCTYPE html>
<html>
	<head>
		<title>b0x Test Network</title>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		</head>
	<body>
		<pre style="white-space: pre-wrap; white-space: -moz-pre-wrap; white-space: -pre-wrap; white-space: -o-pre-wrap; word-wrap: break-word;">
		<font size="2" face="Courier New">

Smart Contracts
==================
`;

Object.keys(addresses).forEach(function(item, index) {
	if (addresses[item] == "") {
		addresses[item] = "[abi only]";
	}
	outHTML += item+` :: `+addresses[item]+` <a href="abi/`+item+`.abi.json" target="_blank">abi</a>
`;
});

outHTML += `

`;
Object.keys(addresses_0x).forEach(function(item, index) {
	outHTML += item + " :: " + addresses_0x[item] + "\n";
});
outHTML += `

		</font>
		</pre>
	</body>
</html>`;

fs.writeFile("./html_public_test/index.html", outHTML, function(err) {
	if(err) {
		console.err("Error: "+err);
	}
});

Object.keys(addresses_0x).forEach(function(item, index) {
	fs.writeFileSync("./html_public_test/deployed/"+item+".json", JSON.stringify({
		"name": item,
		"address": addresses_0x[item],
		"abi": []
	}), function(err) {
		if(err) {
			console.log(item+".json Error: "+err);
		}
	});
});

}

