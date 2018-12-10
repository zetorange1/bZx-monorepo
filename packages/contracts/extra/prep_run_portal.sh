#!/bin/bash

cd ..
npm run preptestnet
cd ../bzx.js
npm run build
cd ../portal
npm run dev
