#!/bin/bash

cd ./../contracts/
yarn run network:deploy

cd ./../bzx.js/
yarn run build

cd ./../contracts/
yarn run network:run
