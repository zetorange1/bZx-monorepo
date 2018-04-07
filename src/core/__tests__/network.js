/* eslint-disable camelcase */
import ganache from "ganache-cli";
import fs from "fs-extra";
import ziptool from "ziptool";

const DEFAULT_TESTNET_FOLDER = "./test_network";

const unzip = (from, to) =>
  new Promise((resolve, reject) =>
    ziptool.unzip(from, to, err => {
      if (err) reject(err);
      resolve();
    })
  );

export const deploy = async (folder = DEFAULT_TESTNET_FOLDER) => {
  await fs.emptyDir(folder);
  await unzip("../protocol_contracts/extra/b0x_db_latest.zip", folder);
};

export const run = ({
  network_id = 50,
  port = 8545,
  db_path = DEFAULT_TESTNET_FOLDER,
  mnemonic = "concert load couple harbor equip island argue ramp clarify fence smart topic"
} = {}) => {
  const options = {
    network_id,
    port,
    db_path,
    mnemonic
  };
  const server = ganache.server(options);
  server.listen(options.port, options.hostname, err => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(
      `Listening on ${options.hostname || "localhost"}:${options.port}`
    );
  });
  return server;
};
