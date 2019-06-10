
var txnHash = "";
if (process.argv.length >= 3) {
    txnHash = process.argv[2];
}

if (!txnHash) {
    console.log("No txn hash supplied!");
    process.exit();
}
if (txnHash.length !== 66) {
    console.log("Invalid txn hash supplied!");
    process.exit();
}

var fs = require('fs');
var request = require('request');
var secrets = require("../../../../config/secrets.js");

const useFile = ""; // "output.log";

let jsonText;
if (useFile) {

    jsonText = fs.readFileSync(useFile, "utf8");
    console.log(processVmTrace(jsonText));
} else {

    request.post('https://eth-mainnet.alchemyapi.io/jsonrpc/'+secrets["alchemy_apikey"], {
        json: JSON.parse('{"method":"trace_replayTransaction","params":["'+txnHash+'",["vmTrace"]],"id":1,"jsonrpc":"2.0"}')
    }, (error, res, body) => {
        if (error) {
            console.error(error);
            return;
        }
        if (body.error) {
            console.log(body.error);
            return;
        }

        jsonText = JSON.stringify(body);
        //fs.writeFileSync("output.log", jsonText+"\n");

        console.log(processVmTrace(jsonText));
    });
}

function processVmTrace(trace) {
    var res = trace.match(/0x08c379a[^"]+/gi);
    //console.log(res);

    res = res.filter(function(item, pos) {
        // remove dups
        return res.indexOf(item) == pos;
    }).map(function(item, pos) {
        // error string starts at index 138
        return hex2a(item.substr(138));
    }).filter(function(item, pos) {
        // no empty strings
        return item;
    });

    return res;
}

function hex2a(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
