
const fs = require("fs");
const exec = require('child_process').exec;

const config = require('../../config/secrets.js');

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

var isSuccess = true;

exec('git checkout master && git pull', {
	cwd: config["asset_commit"]["repo_path"]
	}, function(error, stdout, stderr) {
		console.log("stdout: "+stdout);
		console.log("stderr: "+stderr);
		console.log("error: "+error);
		if (error || (stderr && stderr.indexOf("Already on") == -1) || stdout.indexOf("Your branch is up-to-date") == -1) {
			isSuccess = false;
		}
		else {
			finish();
		}
});

function finish() {
	Object.keys(addresses).forEach(function(item, index) {
		var contents = fs.readFileSync("./build/contracts/"+item+".json");
		var jsonContent = JSON.parse(contents);

		try {
			var address = "";
			if (item != "EIP20") {
				address = jsonContent["networks"]["50"]["address"];
			}
			var jsonAsset = {
				"address": address,
				"abi": jsonContent["abi"]
			};
			
			fs.writeFileSync(config["asset_commit"]["drop_path"]+item+".json", JSON.stringify(jsonAsset), function(err) {
				if(err) {
					console.log(item+".json Error: "+err);
					isSuccess = false;
				}
			});
		}
		catch(err) {
			console.log(item+".json Error: "+err);
			isSuccess = false;
		}
	});

	if (isSuccess) {
		exec('npm run build', {
			cwd: config["asset_commit"]["repo_path"]
			}, function(error, stdout, stderr) {
				console.log("stdout: "+stdout);
				console.log("stderr: "+stderr);
				console.log("error: "+error);

				if (!error && stderr.indexOf("ERROR in") == -1) {
					exec(config["asset_commit"]["git_command"], {
						cwd: config["asset_commit"]["repo_path"]
						}, function(error, stdout, stderr) {
							console.log("stdout: "+stdout);
							console.log("stderr: "+stderr);
							console.log("error: "+error);
					});
				}
		});
	}
}

