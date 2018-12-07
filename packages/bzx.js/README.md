# bzx.js

Javascript library for bZx. Allows for interaction with bZx smart contracts on the Ethereum blockchain.

# Install

```
npm install --save @bzxnetwork/bzx.js
```

# Initialize

```javascript
const Web3 = require("web3");
const { BZxJS } = require("@bzxnetwork/bzx.js");

const networkId = await web3.eth.net.getId();
const bzx = await new BZxJS(web3, { networkId });
```

# Development

1. Install yarn if needed: `npm install -g yarn`.

2. Run `yarn install` to install dependencies.

3. Run `yarn dev` to start webpack in watch mode.

Whenever a file is saved, webpack rebuilds and outputs `bzx.js` in the `/dist` directory.

# Production

1. Run `yarn build`.
