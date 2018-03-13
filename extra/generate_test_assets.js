
var fs = require("fs");

const Web3 = require('web3');
let web3 = new Web3();

if (!fs.existsSync("./html_public_test")) {
    fs.mkdirSync("./html_public_test");
	proceed();
} else {
	var rimraf = require('rimraf');
	rimraf('./html_public_test', function () {
		//console.log('done');
		fs.mkdirSync("./html_public_test");
		proceed();
	});
}

function proceed() {
if (!fs.existsSync("./html_public_test/abi")) {
    fs.mkdirSync("./html_public_test/abi");
}
if (!fs.existsSync("./html_public_test/deployed")) {
    fs.mkdirSync("./html_public_test/deployed");
}


var addresses = {
	"B0x": "unknown",
	"B0xVault": "unknown",
	"B0xTo0x": "unknown",
	"B0xOracle": "unknown",
	"B0xToken": "unknown",
	"TokenRegistry": "unknown",
	"OracleRegistry": "unknown",

	"TestToken0": "unknown",
	"TestToken1": "unknown",
	"TestToken2": "unknown",
	"TestToken3": "unknown",
	"TestToken4": "unknown",
	"TestToken5": "unknown",
	"TestToken6": "unknown",
	"TestToken7": "unknown",
	"TestToken8": "unknown",
	"TestToken9": "unknown",

	"EIP20": "unknown",
};


Object.keys(addresses).forEach(function(item, index) {
	var contents = fs.readFileSync("./build/contracts/"+item+".json");
	var jsonContent = JSON.parse(contents);

	var abi = "";
	try {
		addresses[item] = "";
		if (item != "EIP20") {
			addresses[item] = web3.toChecksumAddress(jsonContent["networks"]["50"]["address"]);
		}
		var jsonAsset = {
			"address": addresses[item],
			"abi": jsonContent["abi"]
		};
		
		abi = JSON.stringify(jsonContent["abi"], null, '\t');

		fs.writeFileSync("./html_public_test/deployed/"+item+".json", JSON.stringify(jsonAsset), function(err) {
			if(err) {
				console.log(item+".json Error: "+err);
			}
		});
	}
	catch(err) {
		console.log(item+".json Error: "+err);
	}

	if (abi != "") {
		/*console.log("address:", address);
		console.log("abi:", abi);*/
		fs.writeFile("./html_public_test/abi/"+item+".abi.json", abi, function(err) {
			if(err) {
				console.log(item+".json Error: "+err);
			}
		});
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

ZRXToken :: 0x25B8Fe1DE9dAf8BA351890744FF28cf7dFa8f5e3
EtherToken :: 0x48BaCB9266a570d521063EF5dD96e61686DbE788

		</font>
		</pre>
	</body>
</html>`;

fs.writeFile("./html_public_test/index.html", outHTML, function(err) {
	if(err) {
		console.err("Error: "+err);
	}
});

fs.writeFileSync("./html_public_test/deployed/ZRXToken.json", JSON.stringify({
	"address": "0x25B8Fe1DE9dAf8BA351890744FF28cf7dFa8f5e3",
	"abi": ""
}), function(err) {
	if(err) {
		console.log(item+".json Error: "+err);
	}
});

fs.writeFileSync("./html_public_test/deployed/EtherToken.json", JSON.stringify({
	"address": "0x48BaCB9266a570d521063EF5dD96e61686DbE788",
	"abi": ""
}), function(err) {
	if(err) {
		console.log(item+".json Error: "+err);
	}
});

}

