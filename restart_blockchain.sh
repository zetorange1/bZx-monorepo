#!/bin/bash

## to run at boot, add this to /etc/rc.local -> cd /path/to/here && su ec2-user -c ./restart_blockchain.sh

rimraf ./build/contracts/*
truffle compile
npm run stop_blockchain
npm run deploy_network
npm run start_blockchain
sleep 3
npm run migrate_contracts
