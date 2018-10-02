#!/bin/bash

rimraf ./artifacts/*

cd ./../contracts/
yarn run network:deploy
cp ./test_network/deployed/*.json ./../starter_project/artifacts/

cd ./../bzx.js/
yarn run build

cd ./../contracts/
yarn run network:run
