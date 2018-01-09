#!/bin/bash

## pm2 setup and common commands
## =============================
## pm2 start ./restart_blockchain.sh -e logs/blockchain_startup_err.log -o logs/blockchain_startup.log --name blockchain --no-autorestart
## pm2 save
## 
## pm2 list
## pm2 restart blockchain
## pm2 stop blockchain
## pm2 delete blockchain
## 

rimraf ./build/contracts/*
truffle compile
npm run stop_blockchain
npm run deploy_network
npm run start_blockchain
sleep 3
npm run migrate_contracts
npm run test_assets
