
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
		abi = JSON.stringify(jsonContent["abi"])
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
Listening on b0x.network:8545

Smart Contracts
==================
`;

Object.keys(addresses).forEach(function(item, index) {
	outHTML += item+` :: `+addresses[item]+` <a href="abi/`+item+`.abi.json" target="_blank">abi</a>
`;
});

outHTML += `

ZRXToken :: 0x25B8Fe1DE9dAf8BA351890744FF28cf7dFa8f5e3
EtherToken :: 0x48BaCB9266a570d521063EF5dD96e61686DbE788


Available Accounts
==================
(0) 0x5409ed021d9299bf6814279a6a1411a7e866a631
(1) 0x6ecbe1db9ef729cbe972c83fb886247691fb6beb
(2) 0xe36ea790bc9d7ab70c55260c66d52b1eca985f84
(3) 0xe834ec434daba538cd1b9fe1582052b880bd7e63
(4) 0x78dc5d2d739606d31509c31d654056a45185ecb6
(5) 0xa8dda8d7f5310e4a9e24f8eba77e091ac264f872
(6) 0x06cef8e666768cc40cc78cf93d9611019ddcb628
(7) 0x4404ac8bd8f9618d27ad2f1485aa1b2cfd82482d
(8) 0x7457d5e02197480db681d3fdf256c7aca21bdc12
(9) 0x91c987bf62d25945db517bdaa840a6c661374402

Private Keys
==================
(0) f2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d
(1) 5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72
(2) df02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1
(3) ff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0
(4) 752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249
(5) efb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd
(6) 83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f
(7) bb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2
(8) b2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f
(9) 23cb7121166b9a2f93ae0b7c05bde02eae50d64449b2cbb42bc84e9d38d6cc89

HD Wallet
==================
Mnemonic:      concert load couple harbor equip island argue ramp clarify fence smart topic
Base HD Path:  m/44'/60'/0'/0/{account_index}
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

