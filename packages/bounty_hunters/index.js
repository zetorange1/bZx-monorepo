#!/usr/bin/env node

const forever = require("forever-monitor");

const config = {
  max: 9999,
  args: process.argv
};
const child = new forever.Monitor("hunt.js", config);

child.on("watch:restart", function(info) {
  console.error(`Restaring script because ${info.file} changed`);
});

child.on("restart", function() {
  console.error(`Forever restarting script for ${child.times} time`);
});

child.on("exit", function() {
  console.log(`hunt.js has exited after ${config.max} restarts`);
});

child.start();
