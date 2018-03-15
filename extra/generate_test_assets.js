
var fs = require("fs");

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
};


Object.keys(addresses).forEach(function(item, index) {
	var contents = fs.readFileSync("./build/contracts/"+item+".json");
	var jsonContent = JSON.parse(contents);

	var abi = "";
	try {
		abi = JSON.stringify(jsonContent["abi"], null, '\t')
		addresses[item] = jsonContent["networks"]["50"]["address"]
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
Listening on https://testnet.b0x.network:443

<a href="contracts.json" target="_blank">Contracts JSON</a>

Smart Contracts
==================
`;

Object.keys(addresses).forEach(function(item, index) {
	outHTML += item+` :: `+addresses[item]+` <a href="abi/`+item+`.abi.json" target="_blank">abi</a>
`;
});

outHTML += `

ZRXToken :: 0xa38a5c8f63b7df14e5078b95a1807abb8f41f166 <a href="abi/ZRXToken.abi.json" target="_blank">abi</a>
EtherToken :: 0xb6c04208e4ebb505c3c40b8fcf13051428fcd25e <a href="abi/EtherToken.abi.json" target="_blank">abi</a>
Exchange :: 0xbae32c0672d99bb465a296cd9b8dfc3441ddafbe <a href="abi/Exchange.abi.json" target="_blank">abi</a>
TokenTransferProxy :: 0x6f16a6860719ed581d0cbeb40dab04508d30acba <a href="abi/TokenTransferProxy.abi.json" target="_blank">abi</a>

		</font>
		</pre>
	</body>
</html>`;

fs.writeFile("./html_public_test/index.html", outHTML, function(err) {
	if(err) {
		console.err("Error: "+err);
	}
});
}

