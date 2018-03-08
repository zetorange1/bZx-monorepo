#!/bin/bash

## to run at boot, add this to /etc/rc.local -> cd /path/to/here && su ec2-user -c ./restart_blockchain.sh

cd ./
rimraf ./build/contracts
npm run build
npm run blockchain:stop
npm run network:deploy
npm run blockchain:start
sleep 3
npm run migrate
npm run assets
