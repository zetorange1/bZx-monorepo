# Bounty Hunter scripts

This repo contains scripts that bounty hunters can run to monitor the health of open bZx loans.
Unhealthy loans are liquidated automatically.

The wallet used will be compensated with bounty rewards. Wallets can be derived using mnemonic phrase, private key, or with a Ledger device.

# Usage

1. Install deps: yarn install
2. Define secrets.js located in <package root>/config/secrets.js or create your own and make sure the path referenced in the script is correct.
3. Run the script for a particular network in one of these ways:

without supervisor:
- yarn run hunt ropsten
- node ./hunt.js --network ropsten

with supervisor (forever):
- node ./index.js --network ropsten

with supervisor (pm2):
- see pm2_setup.txt
