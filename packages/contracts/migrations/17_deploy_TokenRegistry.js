var TokenRegistry = artifacts.require("TokenRegistry");
var BZRxToken = artifacts.require("BZRxToken");

const path = require("path");
const config = require("../protocol-config.js");

module.exports = (deployer, network, accounts) => {
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage")
    network = "development";
  else {
    // comment out if we need to deploy to other networks
    /*web3.eth.getBalance(accounts[0], function(error, balance) {
      console.log("migrations :: final balance: " + balance);
    });*/
    return;
  }

  deployer.deploy(TokenRegistry).then(async function(registry) {
    var bzrx_token;
    if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
      bzrx_token = await BZRxToken.at(config["addresses"][network]["BZRXToken"]);
    } else {
      bzrx_token = await BZRxToken.deployed();
    }

    var bzrx_token_name = await bzrx_token.name.call();
    var bzrx_token_symbol = await bzrx_token.symbol.call();

    await registry.addToken(
      bzrx_token.address,
      bzrx_token_name,
      bzrx_token_symbol,
      18,
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QA6RXhpZgAATU0AKgAAAAgAA1EQAAEAAAABAQAAAFERAAQAAAABAAAuI1ESAAQAAAABAAAuIwAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD079qT4xeIPjt4x1LxFrepXl1JdTt9ms3lZoLGLdlYoVzhVVR2GWOWJLEk+qeMP+UGel5ZuPFr4x/1+zYrr9a8LfsbzXOy48deN1kiJBC211we/wDy6VQ1bQ/2R28CNotx8VvjQvhIXJn/ALOzqf8AZKzFi24RfZPJDbiTkDOSe9fpeW4hKFKDpz9ycZ6Qb0V9Px3P4X4P4fxuGq47E5hmOGrVMTSnByWJg3ebi+ZvsrfiflR4khmgvZnif92zEnHUHvV79nv9svxt+yD8YdF8YeEdZ1LTzYX0LXlis7La6zbhwZba4jztdHQMvIyhIZSrqrD7t/bB/Yq/Z/0P/gn3rHxm+EeteMNcih1OHT4JtTlaOFmNwsUoMUkEb8ZIB4Geea/L3U42e8MNwfM2ngnjj1r+peD8dgs9wtSNWk3CLcJRnGzdkrpp+q3Pdw+U4zJMZT9rOLlyxnGUJXTTvZprR7fcfc/iTSWsr15F3NHMxIJ7HuK+q/hD8f8A9nvxL+wfpvwl+LXjbWNBuI9Sl1C4g03Tr2SVf9IeSP8Aex20seCCCQOee1eL/tN/B7X/ANn7xdrHh/XNNuoJLd5fs108JFvexgnZNE+MOCMHj7pyrAMCo+cfE2nSS2vmbWZozu3Y6g9f8a/nfJ8DDM6cHWnKPK04uLSd1s9U/wAvM/GuCc4x/DeY144mhFzcZUZwqxlazabuk4u94rrtqfW/7c37RH7OnhD/AIJoal8HfhL421jXLy61qDU7a21DS75JZP8AS0lmJlktoowAMkAkE9smvy28YKo09plP7xBsx3IP+HX869K8Zr9uMnysWh4QAdcdfz5/Sj9nf9lLxt+2n8atE8GeEdH1C8a8uokvb1LdmtNGt2YCS5uJMbY0RMtycscKoZ2VT/QXBOCwuS4KVSrVfLzSqTlNrqldtpJWsl87+SP2ajnGKz7FUH7GMZRjGEY000rK9kk3J9bbn//Z"
    );

    await registry.addToken(
      config["addresses"][network]["ZeroEx"]["ZRXToken"],
      "0x Protocol Token",
      "ZRX",
      18,
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IArs4c6QAAAW5QTFRFAAAAVVVVSUlJNTU1My0tMiwsMi8vMS0tMiwsMSwsMCwsMS0tMC0tMC0tMSwsMCwsMCwsMC0t////MCwsNDAw5OPj7e3tMi4uOTU1RUJCR0NDaWZmgH19lpSUtLKy5+fn6urq7Ovr/v7+/Pz8REBARUFBODU14N/f6enp4+Li5eTkm5qauri41NPT7ezsgX5+goCAsK6uUU1Nr62tOjY27u7u8vHxioeH8vLy9fX19vX19vb2NzMzm5mZMy8vPTo6Y2Bg4eHhZGFhsbCwsrGxZWJi5ubmZmNj6ejonJqatbS0trW1uLe3SEREurm5vLu7vry8wcDAtbOz5eXlxMPDaGVlPzs7a2hoTEhITktLT0xMOzc3Uk5OUk9PVlNTXVpaPDg4PDk5RkNDgX9/MS0tSUVF1dTU1tXV3d3d3t3dSUZGSkdH8PDwUE1NQDw8lJKSycjIlZOT9/f3+Pj4+vr6+/v7QT4+/f39Qz8/ODQ0oHre+wAAABJ0Uk5TAAYHGC0uR4KVlr/H2ePx8vP009oDlQAAAbRJREFUeF6Fk1Wz20AMhZ2kje0k9zY5sh1mZrrMUGZmZmb897XsnW086Yy/F50Za1fyWUn5RyCsRWLxeCyihQPKPCF9kSSLekjxElQT5CGhBj3HozRHdOaSowv0HxaOyPPiu3Hr0PxebZ7NbYmMkKgv7l99D8Hgvqji9qES8/EKBCjuUTpDjOoUcPp/UYQAF3cpu2xecP6Fi+jE1C0AJwfARo6SZypA3+AM3fbP8ecdZSsYL91tvbxDZBRgk3ccCyhhjo3yI+oWbJE2iJkCWHvCKqxoHIYo3kwaJEldA5BjpSkRDj3gOs3wtgXgMquIEuPQAfCJJDUTNq9ZxpQ4h3UA1RMy4d4+bL6yjLsJm7Ap12TGw2/cJatjbokmbEq3STICYDol3CYvAbA+0AxXgZ7bpMYhxzamSGIkG28wYqW5Rj1eATAm5icXOr5ND04vOUYJq/OwKRhEB6XSJDVF5QbVXKvFYxl9oNJNPs//Aiy20aoTo8vnzrStLP3+DAHaT8Vzy4HJ1OlUGQK8ShOjekZusgzBypcdMXLeof0zPGdWf3TOP0vJofUbe//F8V89/+X1Xf+/rJVSubRUnPUAAAAASUVORK5CYII="
    );

    var WETH = config["addresses"][network]["ZeroEx"]["WETH9"];
    if (WETH == "") {
      WETH = config["addresses"][network]["ZeroEx"]["EtherToken"];
    }
    await registry.addToken(
      WETH,
      "Wrapped Ether",
      "WETH",
      18,
      "data:image/jpeg;base64,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"
    );

    var BZxEther = artifacts.require("BZxEther");
    await registry.addToken(
      BZxEther.address,
      "bZx Ether",
      "BETH",
      18,
      "data:image/jpeg;base64,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"
    );

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenRegistry deploy: #done`);
  });
};
