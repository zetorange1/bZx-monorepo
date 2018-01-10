import React, { Component } from 'react';
import getWeb3 from './utils/getWeb3'
import { B0xJS } from './b0x.js'
import BigNumber from 'bignumber.js'
import logo from './logo.svg';
import './App.css';


const startB0x = () => 
  new Promise((resolve, reject) => {
    const gasPrice = new BigNumber(window.web3.toWei(21, 'gwei'))
    window.b0x = new B0xJS(window.web3.currentProvider, { 
      exchangeContractAddress: undefined,
      gasPrice: gasPrice,
      networkId: 50,
      orderWatcherConfig: undefined,
      tokenRegistryContractAddress: undefined,
      tokenTransferProxyContractAddress: undefined,
     })
    resolve(window.b0x)
  })

const log = (type) => console.log.bind(console, type);

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      web3: null,
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(startB0x)
	  .then(console.log)
	  .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      //this.instantiateContracts()
    })
    .catch(err => {
      //console.log('Error finding web3.')
	    console.log(`caught ${err}`)
    })
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">b0x portal</h1>
        </header>
        <p className="App-intro">
          ...
        </p>
      </div>
    );
  }
}

export default App
