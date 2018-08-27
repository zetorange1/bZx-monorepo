# Bounty Hunter scripts

This repo contains scripts that bounty hunters can run to monitor the health of open b0x loans.
Unhealthy loans are liquidated automatically.

The wallet used will be compensated with bounty rewards. Wallets can be derived using mnemonic phrase, private key, or with a Ledger device.

# Usage

1. Install deps: npm install
2. Define secrets.js according to example in hunt.js and make sure the path referenced in the script is correct.
3. Run the script for a particular network in one of these ways:

- npm run hunt ropsten
- node ./hunt.js --network ropsten
