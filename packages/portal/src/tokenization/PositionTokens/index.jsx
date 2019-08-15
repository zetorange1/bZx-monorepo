import { Fragment } from "react";
import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import BZxComponent from "../../common/BZxComponent";
import { COLORS } from "../../styles/constants";
import { fromBigNumber, toBigNumber } from "../../common/utils";
import { TextField, Input, InputLabel, InputAdornment, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";

const IsSaleLive = true;

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ShowInfo = styled.div`
  display: inline-block;
  margin: 6px;
`;

const Button = styled(MuiButton)`
  margin: 6px !important;
`;

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 6px;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
`;

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  //display: inline-block;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
`;

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
}
`;

function stringToHex (tmp) {
  if (!tmp)
    return '';
  
  var str = '',
      i = 0,
      tmp_len = tmp.length,
      c;

  for (; i < tmp_len; i += 1) {
      c = tmp.charCodeAt(i);
      str += c.toString(16);
  }
  return str;
}

export default class PositionTokens extends BZxComponent {
  state = { 
    loading: false, 
    error: false,
    tokenBalance: 0,
    tokenPrice: 0,
    liquidationPrice: 0,
    marketLiquidityForLoan: 0,
    //totalTokens: 0,
    //totalTokenBonus: 0,
    //ethRate: 0,
    tokenContract: null,
    tokenContractSymbol: ``,
    iTokenContract: null,
    buyAmount: 0,
    sellAmount: 0,
    wethBalance: 0,
    wethBalanceContract: 0,
    otherTokenBalance: 0,
    otherTokenBalanceContract: 0,
    reserveBalance: 0,
    ethBalance: 0,
    contractEthBalance: 0,
    showBuyDialog: false,
    showSellDialog: false,
    showSendDialog: false,
    recipientAddress: ``,
    sendAmount: ``,
    vaultAddress: null,
    faucetAddress: null,
    vaultTradeTokenBalance: 0,
    vaultLoanedTokenBalance: 0,
    faucetTradeTokenBalance: 0,
    faucetLoanedTokenBalance: 0,
    splitFactor: 0,
    currentLeverage: 0,
    assetAddress: null
  };

  async componentDidMount() {

    let iTokenAddress, pTokenAddress, tradeTokenContract;

    /** TEMP **/
      let TokenizedRegistry_addr;
      if (this.props.bZx.networkId === 1) {
        TokenizedRegistry_addr = "0xd8dc30d298ccf40042991cb4b96a540d8affe73a";
      } else if (this.props.bZx.networkId === 3) {
        TokenizedRegistry_addr = "0xAA5C713387972841995553c9690459596336800b";
      }
      let tokenizedRegistry = await this.props.bZx.getWeb3Contract(`TokenizedRegistry`,TokenizedRegistry_addr);
      const tokenList = await this.wrapAndRun(tokenizedRegistry.methods.getTokens(0, 10, 0).call());
      console.log(`tokenList`,tokenList);

      iTokenAddress = this.props.activeTokenizedTab === `tokenizedloans_positiontokens_short` ? 
        (await tokenList.filter(t => t.symbol === `iETH`)[0]).token :
        (await tokenList.filter(t => t.symbol === `iDAI`)[0]).token;

      pTokenAddress = this.props.activeTokenizedTab === `tokenizedloans_positiontokens_short` ? 
        (await tokenList.filter(t => t.symbol === `dsETH2x`)[0]).token :
        (await tokenList.filter(t => t.symbol === `dLETH2x`)[0]).token;

      if (this.props.bZx.networkId === 50) { // development
        tradeTokenContract = await this.props.bZx.getWeb3Contract(`TestToken9`);
      } else if (this.props.bZx.networkId == 3 || this.props.bZx.networkId == 1) { // ropsten or mainnet
        tradeTokenContract = this.props.activeTokenizedTab === `tokenizedloans_positiontokens_short` ? 
          await this.props.bZx.getWeb3Contract(`EIP20`, (await this.props.tokens.filter(t => t.symbol === `DAI`)[0]).address) : 
          await this.props.bZx.getWeb3Contract(`EIP20`, (await this.props.tokens.filter(t => t.symbol === `WETH`)[0]).address)
      }
    /** TEMP **/

    const iTokenContract = await this.props.bZx.getWeb3Contract(`LoanToken`, iTokenAddress);
    console.log(`iToken contract:`, iTokenContract._address);

    const tokenContract = await this.props.bZx.getWeb3Contract(`PositionToken`, pTokenAddress);
    console.log(`pToken contract:`, tokenContract._address);

    const tokenContractSymbol = (await this.wrapAndRun(tokenContract.methods.symbol().call())).toString();
    console.log(`pToken contract symbol:`, tokenContractSymbol);
  
    console.log(`tradeToken Contract:`, tradeTokenContract._address);
    const tradeTokenContractSymbol = (await this.wrapAndRun(tradeTokenContract.methods.symbol().call())).toString();

    const vaultAddress = (await this.props.bZx.getWeb3Contract(`BZxVault`))._address;
    
    let faucetAddress = ``;
    if (this.props.bZx.networkId === 50) {
      faucetAddress = (await this.props.bZx.getWeb3Contract(`TestNetFaucet`))._address;
    }

    await this.setState({ 
      iTokenContract,
      tokenContract,
      tokenContractSymbol,
      tradeTokenContract,
      tradeTokenContractSymbol,
      vaultAddress,
      faucetAddress
    });

    await this.refreshTokenData();
  }

  checkAllowance = async (tokenAddress) => {
    const { accounts, bZx } = this.props;
    const allowance = await bZx.getAllowance({
      tokenAddress,
      ownerAddress: accounts[0].toLowerCase(),
      spenderAddress: this.state.tokenContract._address
    });
    return allowance.toNumber() !== 0;
  };
  
  silentAllowance = async (tokenAddress) => {
    const { accounts, bZx } = this.props;
    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.setAllowanceUnlimited({
      tokenAddress: tokenAddress,
      ownerAddress: accounts[0].toLowerCase(),
      spenderAddress: this.state.tokenContract._address,
      getObject: true,
      txOpts
    });

    try {
      let gas = await txObj.estimateGas(txOpts);
      console.log(gas);
      txOpts.gas = window.gasValue(gas);
      await txObj.send(txOpts);
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  getTokenBalance = async (stateVar, tokenStr, who) => {
    const { bZx, tokens, accounts } = this.props;
    const token = await tokens.filter(t => t.symbol === tokenStr)[0];

    const balance = await this.wrapAndRun(bZx.getBalance({
      tokenAddress: token.address,
      ownerAddress: who.toLowerCase()
    }));
    console.log(stateVar, `balance of`, token.name, balance.toNumber());
    await this.setState({ [stateVar]: balance });
  };

  refreshTokenData = async () => {
    const { web3, tokens, accounts } = this.props;
    const { tokenContract, tradeTokenContract, vaultAddress, faucetAddress } = this.state;
    await this.setState({ loading: true });
    
    //console.log(`Token contract:`, tokenContract._address);

    try {
      const assetAddress = await this.wrapAndRun(tokenContract.methods.loanTokenAddress().call());
      const tokenBalance = await this.wrapAndRun(tokenContract.methods.balanceOf(accounts[0]).call());
      const tokenPrice = await this.wrapAndRun(tokenContract.methods.tokenPrice().call());
      const liquidationPrice = await this.wrapAndRun(tokenContract.methods.liquidationPrice().call());
      const marketLiquidityForLoan = await this.wrapAndRun(tokenContract.methods.marketLiquidityForLoan().call());
      //const tokenData = await this.wrapAndRun(tokensaleContract.methods.purchases(accounts[0]).call());
      //console.log(tokenData);

      const checkpointPrice = await this.wrapAndRun(tokenContract.methods.checkpointPrice(accounts[0]).call());
      const splitFactor = await this.wrapAndRun(tokenContract.methods.splitFactor().call());
      //const ethRate = await this.wrapAndRun(tokensaleContract.methods.getEthRate().call());
      //console.log(ethRate);

      const ethBalance = await this.wrapAndRun(web3.eth.getBalance(accounts[0]));
      const contractEthBalance = await this.wrapAndRun(web3.eth.getBalance(tokenContract._address));

      const loanOrderHash = "0x"; //await this.wrapAndRun(iTokenContract.methods.loanOrderHashes(toBigNumber(2, 1e18).toString()).call());
      //await this.props.setiTokenHash(loanOrderHash);
      //await this.props.setiTokenTrader(tokenContract._address);

      console.log(`loanOrderHash, tokenAddress`, loanOrderHash, tokenContract._address);

      const LoanedToken = await this.props.bZx.getWeb3Contract(`WETH`);
      const vaultTradeTokenBalance = await this.wrapAndRun(tradeTokenContract.methods.balanceOf(vaultAddress).call());
      const vaultLoanedTokenBalance = await this.wrapAndRun(LoanedToken.methods.balanceOf(vaultAddress).call());
      
      const currentLeverage = await this.wrapAndRun(tokenContract.methods.currentLeverage().call());
      
      let faucetTradeTokenBalance = ``, faucetLoanedTokenBalance = ``; 
      if (this.props.bZx.networkId === 50) {
        faucetTradeTokenBalance = await this.wrapAndRun(tradeTokenContract.methods.balanceOf(faucetAddress).call());
        faucetLoanedTokenBalance = await this.wrapAndRun(LoanedToken.methods.balanceOf(faucetAddress).call());
      }

      await this.setState({ 
        tokenBalance: tokenBalance,
        tokenPrice: tokenPrice,
        liquidationPrice: liquidationPrice,
        marketLiquidityForLoan: marketLiquidityForLoan,
        ethBalance: ethBalance,
        contractEthBalance: contractEthBalance,
        loading: false, 
        error: false,
        vaultTradeTokenBalance,
        vaultLoanedTokenBalance,
        faucetTradeTokenBalance,
        faucetLoanedTokenBalance,
        checkpointPrice,
        splitFactor,
        currentLeverage,
        assetAddress
      });

      await this.getTokenBalance(`wethBalance`, `WETH`, accounts[0]);
      await this.getTokenBalance(`otherTokenBalance`, `TEST9`, accounts[0]);
      await this.getTokenBalance(`wethBalanceContract`, `WETH`, this.state.tokenContract._address);
      await this.getTokenBalance(`otherTokenBalanceContract`, `TEST9`, this.state.tokenContract._address);
      


    } catch(e) {
      console.log(e);
      this.setState({ 
        error: true, 
        loading: false, 
        tokenBalance: 0,
      });
    }

  }

  setBuyAmount = e => this.setState({ buyAmount: e.target.value });

  setSellAmount = e => this.setState({ sellAmount: e.target.value });

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  toggleBuyDialog = useToken => e =>
    this.setState(p => ({ showBuyDialog: !p.showBuyDialog, useToken }));

  toggleSellDialog = useToken => e =>
    this.setState(p => ({ showSellDialog: !p.showSellDialog, useToken }));

  toggleSendDialog = () =>
    this.setState(p => ({ showSendDialog: !p.showSendDialog }));

  buyToken = async () => {
    const { web3, bZx, accounts } = this.props;
    const { buyAmount, tokenContract, useToken } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    
    let assetAddress = this.state.tradeTokenContract._address;
    
    if (useToken) {
      try {
        const a = await this.checkAllowance(assetAddress);
        if (!a) {
          if (!(await this.silentAllowance(assetAddress))) {
            alert(`Unable to set approval!`);
            return;
          }
        }
      } catch (error) {
        console.error(error);
        alert(`Unable to set approval!`);
        return;
      }
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString(),
      value: useToken ? "0" : toBigNumber(buyAmount, 1e18)
    };

    let txObj;
    if (useToken) {
      txObj = await tokenContract.methods.mintWithToken(
        accounts[0],
        assetAddress,
        toBigNumber(buyAmount, 1e18).toString(),
        0
      );
    } else {
      txObj = await tokenContract.methods.mintWithEther(accounts[0], 0);
    }
    console.log(txOpts);

    try {
      //await txObj
        //.estimateGas(txOpts)
        //.then(gas => {
          //console.log(gas);
          //txOpts.gas = window.gasValue(gas)+10000;
          console.log(txOpts);
          await txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ buyAmount: ``, showBuyDialog: false });
            })
            .then(async () => {
              alert(`Your purchase is complete. It may take a few minutes for this page to update.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The purchase did not complete. Please try again.`);
              this.setState({ buyAmount: ``, showBuyDialog: false });
            });
        /*})
        .catch(error => {
          console.error(error.message);
          alert(`The purchase did not complete. Please try again.`);
          this.setState({ buyAmount: ``, showBuyDialog: false });
        });*/
    } catch (error) {
      console.error(error.message);
      alert(`The purchase did not complete. Please try again.`);
      this.setState({ buyAmount: ``, showBuyDialog: false });
    }
  };

  sellToken = async () => {
    const { web3, bZx, accounts } = this.props;
    const { sellAmount, tokenContract, useToken } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    let assetAddress = this.state.tradeTokenContract._address;
    let txObj;
    if (useToken) {
      txObj = await tokenContract.methods.burnToToken(
        accounts[0],
        assetAddress,
        toBigNumber(sellAmount, 1e18).toFixed(0),
        0
      );
    } else {
      txObj = await tokenContract.methods.burnToEther(
        accounts[0],
        toBigNumber(sellAmount, 1e18).toFixed(0),
        0
      );
    }
    console.log(txOpts);

    try {
      //await txObj
        //.estimateGas(txOpts)
        //.then(gas => {
          //console.log(gas);
          //txOpts.gas = window.gasValue(gas);
          console.log(txOpts);
          await txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ sellAmount: ``, showSellDialog: false });
            })
            .then(async () => {
              alert(`Your burn is complete. It may take a few minutes for this page to update.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The burn did not complete. Please try again.`);
              this.setState({ sellAmount: ``, showSellDialog: false });
            });
        /*})
        .catch(error => {
          console.error(error.message);
          alert(`The burn did not complete. Please try again.`);
          this.setState({ sellAmount: ``, showSellDialog: false });
        });*/
    } catch (error) {
      console.error(error.message);
      alert(`The burn did not complete. Please try again.`);
      this.setState({ sellAmount: ``, showSellDialog: false });
    }
  };

  sendTokens = async () => {
    const { web3, bZx, accounts } = this.props;
    const { recipientAddress, sendAmount, tokenContract } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.transferToken({
      tokenAddress: tokenContract._address,
      to: recipientAddress.toLowerCase(),
      amount: toBigNumber(sendAmount, 10**18).toString(),
      getObject: true,
      txOpts
    });
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ showSendDialog: false });
            })
            .then(() => {
              alert(`The tokens have been sent.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              } else {
                alert(
                  `The transaction is failing. Please check the amount and try again.`
                );
              }
              this.setState({ showSendDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          } else {
            alert(
              `The transaction is failing. Please check the amount and try again.`
            );
          }
          this.setState({ showSendDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      } else {
        alert(
          `The transaction is failing. Please check the amount and try again.`
        );
      }
      this.setState({ showSendDialog: false });
    }
  };

  triggerPosition = async () => {
    const { web3, bZx, accounts } = this.props;
    const { tokenContract } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await tokenContract.methods.triggerPosition(false)
    console.log(txOpts);

    try {
      //await txObj
        //.estimateGas(txOpts)
        //.then(gas => {
          //console.log(gas);
          //txOpts.gas = window.gasValue(gas);
          console.log(txOpts);
          await txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ sellAmount: ``, showSellDialog: false });
            })
            .then(async () => {
              alert(`The txn is complete.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The txn did not complete.`);
              this.setState({ sellAmount: ``, showSellDialog: false });
            });
        /*})
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ sellAmount: ``, showSellDialog: false });
        });*/
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ sellAmount: ``, showSellDialog: false });
    }
  };

  handleSplit = async () => {
    const { web3, bZx, accounts } = this.props;
    const { tokenContract } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await tokenContract.methods.handleSplit()
    console.log(txOpts);

    try {
      //await txObj
        //.estimateGas(txOpts)
        //.then(gas => {
          //console.log(gas);
          //txOpts.gas = window.gasValue(gas);
          console.log(txOpts);
          await txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ sellAmount: ``, showSellDialog: false });
            })
            .then(async () => {
              alert(`The txn is complete.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The txn did not complete.`);
              this.setState({ sellAmount: ``, showSellDialog: false });
            });
        /*})
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ sellAmount: ``, showSellDialog: false });
        });*/
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ sellAmount: ``, showSellDialog: false });
    }
  };

  render() {
    const { 
      loading,
      error,
      tokenBalance,
      tokenPrice,
      liquidationPrice,
      marketLiquidityForLoan,
      tokenContract,
      tokenContractSymbol,
      tradeTokenContractSymbol,
      wethBalance,
      wethBalanceContract,
      otherTokenBalanceContract,
      otherTokenBalance,
      ethBalance,
      contractEthBalance,
      vaultTradeTokenBalance,
      vaultLoanedTokenBalance,
      faucetTradeTokenBalance,
      faucetLoanedTokenBalance,
      checkpointPrice,
      splitFactor,
      currentLeverage,
      useToken
    } = this.state;

    if (error) {
      return (
        <div>
          <InfoContainer>
            <ShowInfo>Web3 error loading. Please refresh in a few minutes.</ShowInfo>
            <Button onClick={this.refreshTokenData} variant="raised" disabled={false}>
              Refresh
            </Button>
          </InfoContainer>
        </div>
      );
    }

    const tokenAddress = tokenContract ? tokenContract._address : null;
    const tokenAddressLink = `${this.props.bZx.etherscanURL}address/${tokenAddress}`;

    console.log(`tokenPrice`,tokenPrice);
    console.log(`checkpointPrice`,checkpointPrice);
    console.log(`tokenBalance`,tokenBalance);
    let profitLoss = toBigNumber(tokenPrice).minus(checkpointPrice).times(tokenBalance).div(10**36);

    return (
      <div>
        <InfoContainer>
          <Button
            onClick={this.refreshTokenData}
            variant="raised"
            disabled={loading}
          >
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>

        <br/>

        <InfoContainer>
          <ShowInfo>
            {!IsSaleLive ? (
            <Fragment>
              <div style={{ fontWeight: `900` }}>*** The token sale is temporarily paused and will resume shortly. Please check back later. ***</div>
              <br/>
            </Fragment>
            ) : ``}
            <DataPointContainer>
              <Label>Position Token ({tokenContractSymbol})</Label>
              <DataPoint>
                <AddressLink href={tokenAddressLink}>
                  {tokenAddress}
                </AddressLink>
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Profit (Loss)</Label>
              <DataPoint>
                {!profitLoss.isNaN() ? profitLoss.lt(0) ? `(`+profitLoss.toString()+`)` : profitLoss.toString() : `0`}
                {` `}
                {`Token`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Market Liquidity (Loan Token)</Label>
              <DataPoint>
                {toBigNumber(
                  marketLiquidityForLoan,
                  10 ** -18
                ).toString()}
                {` `}
                {`Token (Max Deposit)`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>My Token Balance</Label>
              <DataPoint>
                {toBigNumber(
                  tokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {tokenContractSymbol}
                {` (value: `}
                {toBigNumber(tokenBalance).times(tokenPrice).div(10**36).toString()}
                {` DAI)`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Token Price</Label>
              <DataPoint>
                {toBigNumber(
                  tokenPrice,
                  10 ** -18
                ).toString()}
                {` `}
                {tokenContractSymbol}/Token
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Liquidation Price</Label>
              <DataPoint>
                {toBigNumber(
                  liquidationPrice,
                  10 ** -18
                ).toString()}
                {` `}
                {tokenContractSymbol}/Token
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Current Leverage</Label>
              <DataPoint>
                {toBigNumber(
                  currentLeverage,
                  10 ** -18
                ).toString()}
                {`x`}
              </DataPoint>
            </DataPointContainer>
 
            <br/>

            <DataPointContainer>
              <Label>Split Factor</Label>
              <DataPoint>
                {toBigNumber(
                  splitFactor,
                  10 ** -18
                ).toString()}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBuyDialog(false)}
                disabled={!IsSaleLive}
                style={{ marginLeft: `12px` }}
              >
                Buy Token (ether)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleSellDialog(false)}
                disabled={!IsSaleLive}
                style={{ marginLeft: `12px` }}
              >
                Sell Token (ether)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBuyDialog(true)}
                disabled={!IsSaleLive}
                style={{ marginLeft: `12px` }}
              >
                Buy Token (token)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleSellDialog(true)}
                disabled={!IsSaleLive}
                style={{ marginLeft: `12px` }}
              >
                Sell Token (token)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleSendDialog}
                style={{ marginLeft: `12px` }}
              >
                Send Token
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.triggerPosition}
                style={{ marginLeft: `12px` }}
              >
                Trigger Position
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.handleSplit}
                style={{ marginLeft: `12px` }}
              >
                Handle Split
              </Button>
            </DataPointContainer>


            <br/><br/>

            <Label>DEBUG VALUES</Label>

            <br/><br/>

            <DataPointContainer>
              <Label>My ETH Balance</Label>
              <DataPoint>
                {toBigNumber(
                  ethBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>My WETH Balance</Label>
              <DataPoint>
                {toBigNumber(
                  wethBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`WETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>My TEST9 Balance Balance</Label>
              <DataPoint>
                {toBigNumber(
                  otherTokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`TEST9`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>pToken ETH Balance (debug only)</Label>
              <DataPoint>
                {toBigNumber(
                  contractEthBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>pToken WETH Balance (debug only)</Label>
              <DataPoint>
                {toBigNumber(
                  wethBalanceContract,
                  10 ** -18
                ).toString()}
                {` `}
                {`WETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>pToken TEST9 Balance (debug only)</Label>
              <DataPoint>
                {toBigNumber(
                  otherTokenBalanceContract,
                  10 ** -18
                ).toString()}
                {` `}
                {`WETH`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Vault TradeToken Balance</Label>
              <DataPoint>
                {toBigNumber(
                  vaultTradeTokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {tradeTokenContractSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Vault LoanedToken Balance</Label>
              <DataPoint>
                {toBigNumber(
                  vaultLoanedTokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`WETH`}
              </DataPoint>
            </DataPointContainer>

            { this.props.bZx.networkId === 50 ? (
            <Fragment>
            <br/>

            <DataPointContainer>
              <Label>Faucet TradeToken Balance</Label>
              <DataPoint>
                {toBigNumber(
                  faucetTradeTokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {tradeTokenContractSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Faucet LoanedToken Balance</Label>
              <DataPoint>
                {toBigNumber(
                  faucetLoanedTokenBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {`WETH`}
              </DataPoint>
            </DataPointContainer>
            </Fragment>
            ) : ``}

          </ShowInfo>
        </InfoContainer>
        <Dialog
            open={this.state.showBuyDialog}
            onClose={this.toggleBuyDialog(false)}
          >
            <DialogTitle>Buy Position Token ({useToken ? `with token` : `with ETH`})</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {/*BZRX tokens cost 0.000073 ETH each. Please specify the amount of Ether you want
                to send for your purchase. Your purchase will include an additional token bonus of {currentTokenBonus}%.*/}
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>{useToken ? `tradeToken` : `ETH`} to Send</InputLabel>
                <Input
                  value={this.state.buyAmount}
                  type="number"
                  onChange={this.setBuyAmount}
                  endAdornment={
                    <InputAdornment position="end">{useToken ? `tradeToken` : `ETH`}</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleBuyDialog(false)}>Cancel</Button>
              <Button onClick={this.buyToken} color="primary">
                Buy
              </Button>
            </DialogActions>
          </Dialog>
        <Dialog
            open={this.state.showSellDialog}
            onClose={this.toggleSellDialog(false)}
          >
            <DialogTitle>Sell Position Token ({useToken ? `to tradeToken` : `to ETH`})</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Sell Token (burn)
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>{tokenContractSymbol} To Sell</InputLabel>
                <Input
                  value={this.state.sellAmount}
                  type="number"
                  onChange={this.setSellAmount}
                  endAdornment={
                    <InputAdornment position="end">{tokenContractSymbol}</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleSellDialog(false)}>Cancel</Button>
              <Button onClick={this.sellToken} color="primary">
                Sell
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={this.state.showSendDialog}
            onClose={this.toggleSendDialog}
          >
            <DialogTitle>Send Token</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This token will be sent to another account. Please specify the
                recipient address and amount to send.
              </DialogContentText>
              <TextField
                autoFocus
                margin="normal"
                label="Recipient Address"
                fullWidth
                value={this.state.recipientAddress}
                onChange={this.setStateForInput(`recipientAddress`)}
              />
              <FormControl fullWidth>
                <InputLabel>Send Amount</InputLabel>
                <Input
                  value={this.state.sendAmount}
                  type="number"
                  onChange={this.setStateForInput(`sendAmount`)}
                  endAdornment={
                    <InputAdornment position="end">{tokenContractSymbol}</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleSendDialog}>Cancel</Button>
              <Button onClick={this.sendTokens} color="primary">
                Send
              </Button>
            </DialogActions>
          </Dialog>
      </div>
    );
  }
}
