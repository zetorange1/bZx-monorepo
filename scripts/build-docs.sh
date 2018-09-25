#!/bin/bash

rm -rf ./docs/bzx.js
rm -rf ./docs/contracts
mkdir -p ./docs/bzx.js
mkdir -p ./docs/contracts

cd ./packages/bzx.js-docs/
yarn run build
mv -v ./_book/* ./../../docs/bzx.js/
rm -rf ./_book/
cd ../..

cd ./packages/contracts/
cd ./scripts/doxity/
npm i
cd ../..
mkdir _book
./extra/generate_documentation_doxity.sh
mv -v ./_book/* ./../../docs/contracts/
rm -rf ./_book/
cd ../..
