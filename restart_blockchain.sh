#!/bin/bash

rimraf ./build/contracts/*
truffle compile
npm run stop_blockchain 
npm run deploy_network
npm run start_blockchain
sleep 3
npm run migrate_contracts
