import { Fragment } from "react";
import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import BZxComponent from "../../common/BZxComponent";
import { COLORS } from "../../styles/constants";
import { fromBigNumber, toBigNumber } from "../../common/utils";
import { Tooltip, Select, MenuItem, TextField, Input, InputLabel, InputAdornment, FormControl, FormHelperText, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";

const MoreInfo = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

const FormHelperTextWithDetail = styled(FormHelperText)`
  display: flex;
`;

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

export default class LoanTokens extends BZxComponent {
  state = { 
    loading: false, 
    error: false,
    tokenBalance: 0,
    tokenContract: null,
    tokenContractSymbol: ``,
    borrowAmount: 0,
    buyAmount: 0,
    sellAmount: 0,
    wethBalance: 0,
    wethBalanceContract: 0,
    burntReserveBalance: 0,
    burntReserveBalanceContract: 0,
    ethBalance: 0,
    contractEthBalance: 0,
    showBuyDialog: false,
    showSellDialog: false,
    showSendDialog: false,
    showBorrowDialog: false,
    showCurveDialog: false,
    recipientAddress: ``,
    sendAmount: ``,
    tokenPrice: 0,
    totalAssetBorrow: 0,
    totalAssetSupply: 0,
    marketLiquidity: 0,
    supplyInterestRate: 0,
    borrowInterestRate: 0,
    nextLoanInterestRate: 0,
    leverageAmount: `0`,
    leverageHashes: {},
    loanTokenAddress: ``,
    baseRateCurrent: 0,
    rateMultiplierCurrent: 0,
    baseRateNew: 0,
    rateMultiplierNew: 0,
    tokenList: null,
    assetAddress: null,
  };

  async componentDidMount() {

    //let loanTokenAddress;

    /** TEMP **/
    //loanTokenAddress = (await this.props.bZx.getWeb3Contract(`LoanToken`))._address;
    /** TEMP **/

    /*switch (this.props.bZx.networkId) {
      case 1: {
        //tokenAddress = `0x1c74cFF0376FB4031Cd7492cD6dB2D66c3f2c6B9`;
        break;
      }
      case 3: {
        //tokenAddress = `0xF8b0B6Ee32a617beca665b6c5B241AC15b1ACDD5`;
        break;
      }
      default: {
        //tokenAddress = await this.wrapAndRun(tokensaleContract.methods.bZRxTokenContractAddress().call());
        break;
      }
    }*/

    let tokenizedRegistry = await this.props.bZx.getWeb3Contract(`TokenizedRegistry`);
    const tokenList = await this.wrapAndRun(tokenizedRegistry.methods.getTokens(0, 10, 1).call());
    console.log(`tokenList`,tokenList);

    await this.setState({ 
      tokenList
    });
  }

  getWETHBalance = async (stateVar, who) => {
    const { bZx, tokens, accounts } = this.props;
    const token = await tokens.filter(t => t.symbol === `WETH`)[0];

    const balance = await this.wrapAndRun(bZx.getBalance({
      tokenAddress: token.address,
      ownerAddress: who.toLowerCase()
    }));
    console.log(stateVar, `balance of`, token.name, balance.toNumber());
    await this.setState({ [stateVar]: balance });
  };

  refreshTokenData = async () => {
    const { web3, accounts } = this.props;
    const { tokenContract } = this.state;
    await this.setState({ loading: true });
    
    //console.log(`Token contract:`, tokenContract._address);

    try {

      const assetAddress = await this.wrapAndRun(tokenContract.methods.loanTokenAddress().call());

      const tokenBalance = await this.wrapAndRun(tokenContract.methods.balanceOf(accounts[0]).call());

      const checkpointPrice = await this.wrapAndRun(tokenContract.methods.checkpointPrice(accounts[0]).call());

      const listIndex = await this.wrapAndRun(tokenContract.methods.burntTokenReserveListIndex(accounts[0]).call());
      let burntReserveBalance = toBigNumber(0);
      if (listIndex.isSet) {
        burntReserveBalance = (await this.wrapAndRun(tokenContract.methods.burntTokenReserveList(listIndex.index).call())).amount;
      }
      
      const burntReserveBalanceContract = await this.wrapAndRun(tokenContract.methods.burntTokenReserved().call());

      const ethBalance = await this.wrapAndRun(web3.eth.getBalance(accounts[0]));
      const contractEthBalance = await this.wrapAndRun(web3.eth.getBalance(tokenContract._address));

      const supplyInterestRate = await this.wrapAndRun(tokenContract.methods.supplyInterestRate().call());
      const borrowInterestRate = await this.wrapAndRun(tokenContract.methods.borrowInterestRate().call());
      const nextLoanInterestRate = await this.wrapAndRun(tokenContract.methods.nextLoanInterestRate("10000000000000000").call());

      const totalAssetBorrow = await this.wrapAndRun(tokenContract.methods.totalAssetBorrow().call());
      const totalAssetSupply = await this.wrapAndRun(tokenContract.methods.totalAssetSupply().call());
      const tokenPrice = await this.wrapAndRun(tokenContract.methods.tokenPrice().call());

      const marketLiquidity = await this.wrapAndRun(tokenContract.methods.marketLiquidity().call());

      const baseRateCurrent = toBigNumber(
        await this.wrapAndRun(tokenContract.methods.baseRate().call()),
        10 ** -18
      ).toString();
      const rateMultiplierCurrent = toBigNumber(
        await this.wrapAndRun(tokenContract.methods.rateMultiplier().call()),
        10 ** -18
      ).toString();


      await this.setState({
        supplyInterestRate: supplyInterestRate,
        borrowInterestRate: borrowInterestRate,
        nextLoanInterestRate: nextLoanInterestRate,
        tokenPrice: tokenPrice,
        tokenBalance: tokenBalance,
        burntReserveBalance: burntReserveBalance,
        burntReserveBalanceContract: burntReserveBalanceContract,
        ethBalance: ethBalance,
        contractEthBalance: contractEthBalance,
        totalAssetBorrow: totalAssetBorrow,
        totalAssetSupply: totalAssetSupply,
        marketLiquidity: marketLiquidity,
        baseRateCurrent,
        rateMultiplierCurrent,
        baseRateNew: baseRateCurrent,
        rateMultiplierNew: rateMultiplierCurrent,
        checkpointPrice: checkpointPrice,
        assetAddress: assetAddress,
        loading: false, 
        error: false 
      });

      await this.getWETHBalance(`wethBalance`, accounts[0]);
      await this.getWETHBalance(`wethBalanceContract`, this.state.tokenContract._address);

    } catch(e) {
      console.log(e);
      this.setState({ 
        error: true, 
        loading: false, 
        tokenBalance: 0,
      });
    }

  }

  updateLoanToken = async (loanTokenAddress) => {
    if (!loanTokenAddress) {
      await this.setState({ 
        tokenContract: null,
        tokenContractSymbol: null,
        loanTokenAddress,
        leverageHashes: null
      });
      return;
    }
    
    try {

      const tokenContract = await this.props.bZx.getWeb3Contract(`LoanToken`, loanTokenAddress);
      console.log(`Token contract:`, tokenContract._address);
  
      const tokenContractSymbol = (await this.wrapAndRun(tokenContract.methods.symbol().call())).toString();
      console.log(`iToken contract symbol:`, tokenContractSymbol);
  
      const leverageList = await this.wrapAndRun(tokenContract.methods.getLeverageList().call());
  
      let leverageHashes = {};
      for(let i=0; i < leverageList.length; i++) {
        let leverage = toBigNumber(leverageList[i].toString(), 1e-18).toString();
        leverageHashes[leverage] = await this.wrapAndRun(tokenContract.methods.loanOrderHashes(leverageList[i]).call())
      }
  
      await this.props.setCurrentLoan(leverageHashes[2], this.props.accounts[0]);
  
      await this.setState({ 
        tokenContract,
        tokenContractSymbol,
        loanTokenAddress,
        leverageHashes
      });
  
      await this.refreshTokenData();

    } catch(e) {
      console.log(e);
    }
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

  setLoanToken = async e => {
    await this.updateLoanToken(e.target.value);
  }

  setBuyAmount = e => this.setState({ buyAmount: e.target.value });

  setSellAmount = e => this.setState({ sellAmount: e.target.value });

  setborrowAmount = e => this.setState({ borrowAmount: e.target.value });

  setLeverageAmount = async e => {
    await this.setState({ leverageAmount: e.target.value });
    await this.props.setCurrentLoan(this.state.leverageHashes[e.target.value], this.props.accounts[0]);
  }

  setBaseRate = e => this.setState({ baseRateNew: e.target.value });

  setRateMultiplier = e => this.setState({ rateMultiplierNew: e.target.value });

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  toggleBuyDialog = useToken => e =>
    this.setState(p => ({ showBuyDialog: !p.showBuyDialog, useToken }));

  toggleSellDialog = useToken => e =>
    this.setState(p => ({ showSellDialog: !p.showSellDialog, useToken }));

  toggleSendDialog = () =>
    this.setState(p => ({ showSendDialog: !p.showSendDialog }));

  toggleBorrowDialog = () =>
    this.setState(p => ({ showBorrowDialog: !p.showBorrowDialog }));
  
  toggleCurveDialog = () =>
    this.setState(p => ({ showCurveDialog: !p.showCurveDialog }));

  buyToken = async () => {
    const { web3, bZx, accounts, tokens } = this.props;
    const { buyAmount, tokenContract, useToken, assetAddress } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

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
      txObj = await tokenContract.methods.mint(
        accounts[0],
        toBigNumber(buyAmount, 1e18).toString()
      );
    } else {
      txObj = await tokenContract.methods.mintWithEther(accounts[0]);
    }
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas)+10000;
          console.log(txOpts);
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
        })
        .catch(error => {
          console.error(error.message);
          alert(`The purchase did not complete. Please try again.`);
          this.setState({ buyAmount: ``, showBuyDialog: false });
        });
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

    let txObj;
    if (useToken) {
      txObj = await tokenContract.methods.burn(
        accounts[0],
        toBigNumber(sellAmount, 1e18).toFixed(0)
      );
    } else {
      txObj = await tokenContract.methods.burnToEther(
        accounts[0],
        toBigNumber(sellAmount, 1e18).toFixed(0)
      );
    }
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          console.log(txOpts);
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
        })
        .catch(error => {
          console.error(error.message);
          alert(`The burn did not complete. Please try again.`);
          this.setState({ sellAmount: ``, showSellDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The burn did not complete. Please try again.`);
      this.setState({ sellAmount: ``, showSellDialog: false });
    }
  };

  claimToken = async () => {
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

    const txObj = await tokenContract.methods.claimLoanToken();
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          console.log(txOpts);
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
            })
            .then(async () => {
              alert(`Txn complete!`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The txn did not complete. Please try again.`);
            });
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete. Please try again.`);
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete. Please try again.`);
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

  borrowToken = async () => {
    const { web3, bZx, tokens, accounts } = this.props;
    const { borrowAmount, leverageAmount, tokenContract } = this.state;

    const collateralTokenAddress = await tokens.filter(t => t.symbol === `WETH`)[0].address;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    /*const bZxContract = await this.props.bZx.getWeb3Contract(`BZx`);
    const isApproved = await this.wrapAndRun(bZxContract.methods.allowedValidators(accounts[0], tokenContract._address).call());
    if (!isApproved) {
      alert(`Please submit an approval transaction in MetaMask. This is only required the first time you open a loan from this token. Once confirmed, you will be asked to submit the loan transaction.`);
      await bZxContract.methods.toggleDelegateApproved(
        tokenContract._address,
        true
      ).send(txOpts);
    }*/

    const txObj = await tokenContract.methods.borrowToken(
      toBigNumber(borrowAmount, 1e18).toFixed(0),
      toBigNumber(leverageAmount, 1e18).toFixed(0),
      collateralTokenAddress,
      `0x0000000000000000000000000000000000000000`,
      false
    );
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas)+10000;
          console.log(txOpts);
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
              this.setState({ borrowAmount: ``, showBorrowDialog: false });
            })
            .then(async () => {
              alert(`Your loan is open. You can manage it from the BORROWING tab.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`Could not open loan. Please try again.`);
              this.setState({ borrowAmount: ``, showBorrowDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          alert(`Could not open loan. Please try again.`);
          this.setState({ borrowAmount: ``, showBorrowDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`Could not open loan. Please try again.`);
      this.setState({ borrowAmount: ``, showBorrowDialog: false });
    }
  };

  setDemandCurve = async () => {
    const { bZx, accounts } = this.props;
    const { baseRateNew, rateMultiplierNew, tokenContract } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await tokenContract.methods.setDemandCurve(
      toBigNumber(baseRateNew, 1e18).toFixed(0),
      toBigNumber(rateMultiplierNew, 1e18).toFixed(0)
    );
    console.log(txOpts);

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas)+10000;
          console.log(txOpts);
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
              this.setState({ showCurveDialog: false });
            })
            .then(async () => {
              alert(`The txn is complete.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              alert(`The txn did not complete.`);
              this.setState({ showCurveDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ showCurveDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ showCurveDialog: false });
    }
  };

  render() {
    const { 
      loading,
      error,
      tokenBalance,
      tokenPrice,
      tokenContract,
      tokenContractSymbol,
      wethBalance,
      wethBalanceContract,
      burntReserveBalance,
      burntReserveBalanceContract,
      ethBalance,
      contractEthBalance,
      supplyInterestRate,
      borrowInterestRate,
      nextLoanInterestRate,
      totalAssetBorrow,
      totalAssetSupply,
      marketLiquidity,
      leverageAmount,
      loanTokenAddress,
      baseRateCurrent,
      rateMultiplierCurrent,
      checkpointPrice,
      baseRateNew,
      rateMultiplierNew,
      tokenList,
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

    let profitLoss = toBigNumber(tokenPrice).minus(checkpointPrice).times(tokenBalance).div(10**36);

    return (
      <div>
        <InfoContainer>

          <FormControl style={{ width: `150px` }}>
            <InputLabel>Loan Token</InputLabel>
            <Select 
              value={loanTokenAddress} 
              onChange={this.setLoanToken}
            >
              <MenuItem value={``}><em>Please choose</em></MenuItem>
              {tokenList && tokenList.map(token => (
                <MenuItem 
                  key={token.symbol}
                  value={token.token}>{token.symbol}
                </MenuItem>
              ))}
              {/*<MenuItem value={tokenContract ? tokenContract._address : ``}>iETH</MenuItem>*/}
            </Select>
            {/*<FormHelperTextWithDetail component="div">
              <Tooltip
                title={
                  <div style={{ maxWidth: `240px` }}>
                    ...
                  </div>
                }
              >
                <MoreInfo>More Info</MoreInfo>
              </Tooltip>
            </FormHelperTextWithDetail>*/}
          </FormControl>

        </InfoContainer>

        <br/>

        {loanTokenAddress ? (
          <Fragment>

          <Button
            onClick={this.refreshTokenData}
            variant="raised"
            disabled={loading}
          >
            {loading ? `Refreshing...` : `Refresh`}
          </Button>

        <br/>

        <InfoContainer>
          <ShowInfo>

            <DataPointContainer>
              <Label>Loan Token ({tokenContractSymbol})</Label>
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
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Market Liquidity</Label>
              <DataPoint>
                {toBigNumber(
                  marketLiquidity,
                  10 ** -18
                ).toString()}
                {` `}
                {`ETH (Max Borrow)`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Supply</Label>
              <DataPoint>
                {toBigNumber(
                  totalAssetSupply,
                  10 ** -18
                ).toString()}
                {` `}
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Borrow</Label>
              <DataPoint>
                {toBigNumber(
                  totalAssetBorrow,
                  10 ** -18
                ).toString()}
                {` `}
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Supply Interest Rate</Label>
              <DataPoint>
                {toBigNumber(
                  supplyInterestRate,
                  10 ** -18
                ).toString()}
                {`% `}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Borrow Interest Rate</Label>
              <DataPoint>
                {toBigNumber(
                  borrowInterestRate,
                  10 ** -18
                ).toString()}
                {`% `}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Next Borrow Interest Rate (0.01)</Label>
              <DataPoint>
                {toBigNumber(
                  nextLoanInterestRate,
                  10 ** -18
                ).toString()}
                {`% `}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>My Burnt Reserve Balance</Label>
              <DataPoint>
                {toBigNumber(
                  burntReserveBalance,
                  10 ** -18
                ).toString()}
                {` `}
                {tokenContractSymbol}
                {` (value: `}
                {toBigNumber(burntReserveBalance).times(tokenPrice).div(10**36).toString()}
                {` ETH)`}
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
                {` ETH)`}
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
                {tokenContractSymbol}/ETH
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBuyDialog(false)}
                style={{ marginLeft: `12px` }}
              >
                Buy Token (ether)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleSellDialog(false)}
                style={{ marginLeft: `12px` }}
              >
                Sell Token (ether)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBuyDialog(true)}
                style={{ marginLeft: `12px` }}
              >
                Buy Token (token)
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleSellDialog(true)}
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
                onClick={this.claimToken}
                style={{ marginLeft: `12px` }}
              >
                Claim Loan Token
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBorrowDialog}
                style={{ marginLeft: `12px` }}
              >
                Borrow From Token
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleCurveDialog}
                style={{ marginLeft: `12px` }}
              >
                Demand Curve
              </Button>
            </DataPointContainer>

            <br/><br/>

            <Label>DEBUG VALUES</Label>

            <br/><br/>

            <DataPointContainer>
              <Label>Base Rate</Label>
              <DataPoint>
                {baseRateCurrent}%
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Rate Multiplier</Label>
              <DataPoint>
                {rateMultiplierCurrent}%
              </DataPoint>
            </DataPointContainer>

            <br/>

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

            <br/>

            <DataPointContainer>
              <Label>iToken ETH Balance (debug only)</Label>
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
              <Label>iToken WETH Balance (debug only)</Label>
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
              <Label>iToken Burnt Reserve Balance (debug only)</Label>
              <DataPoint>
                {toBigNumber(
                  burntReserveBalanceContract,
                  10 ** -18
                ).toString()}
                {` `}
                {tokenContractSymbol}
              </DataPoint>
            </DataPointContainer>

          </ShowInfo>
        </InfoContainer>
        <Dialog
            open={this.state.showBuyDialog}
            onClose={this.toggleBuyDialog(false)}
          >
            <DialogTitle>Buy Loan Token ({useToken ? `with token` : `with ETH`})</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {/*BZRX tokens cost 0.000073 ETH each. Please specify the amount of Ether you want
                to send for your purchase. Your purchase will include an additional token bonus of {currentTokenBonus}%.*/}
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>{useToken ? `Token` : `ETH`} to Send</InputLabel>
                <Input
                  value={this.state.buyAmount}
                  type="number"
                  onChange={this.setBuyAmount}
                  endAdornment={
                    <InputAdornment position="end">{useToken ? `Token` : `ETH`}</InputAdornment>
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
            <DialogTitle>Sell Loan Token ({useToken ? `to token` : `to ETH`})</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Sell Token (burn)
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>{tokenContractSymbol} to Sell</InputLabel>
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
          <Dialog
            open={this.state.showBorrowDialog}
            onClose={this.toggleBorrowDialog}
          >
            <DialogTitle>Borrow From Token ({tokenContractSymbol})</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {/*BZRX tokens cost 0.000073 ETH each. Please specify the amount of Ether you want
                to send for your purchase. Your purchase will include an additional token bonus of {currentTokenBonus}%.*/}
              </DialogContentText>
              <br/>
              <FormControl>
                <InputLabel>Leverage</InputLabel>
                <Select 
                  value={leverageAmount} 
                  onChange={this.setLeverageAmount}
                >
                  <MenuItem value={`0`}><em>Please choose</em></MenuItem>
                  <MenuItem value={`1`}>1x Leverage (100%/15%)</MenuItem>
                  <MenuItem value={`2`}>2x Leverage (50%/15%)</MenuItem>
                  <MenuItem value={`3`}>3x Leverage (33.333%/15%)</MenuItem>
                  <MenuItem value={`4`}>4x Leverage (25%/15%)</MenuItem>
                </Select>
                {/*<FormHelperTextWithDetail component="div">
                  <Tooltip
                    title={
                      <div style={{ maxWidth: `240px` }}>
                        ...
                      </div>
                    }
                  >
                    <MoreInfo>More Info</MoreInfo>
                  </Tooltip>
                </FormHelperTextWithDetail>*/}
              </FormControl>
              <br/><br/><br/>
              <FormControl fullWidth>
                <InputLabel>ETH to Borrow</InputLabel>
                <Input
                  value={this.state.borrowAmount}
                  type="number"
                  onChange={this.setborrowAmount}
                  endAdornment={
                    <InputAdornment position="end">ETH</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleBorrowDialog}>Cancel</Button>
              <Button onClick={this.borrowToken} disabled={leverageAmount === `0`} color="primary">
                Borrow
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={this.state.showCurveDialog}
            onClose={this.toggleCurveDialog}
          >
            <DialogTitle>Update Demand Curve</DialogTitle>
            <DialogContent>
              <DialogContentText>
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>Base Rate</InputLabel>
                <Input
                  value={baseRateNew}
                  type="number"
                  onChange={this.setBaseRate}
                  endAdornment={
                    <InputAdornment position="end">%</InputAdornment>
                  }
                />
              </FormControl>
              <br/><br/>
              <FormControl fullWidth>
                <InputLabel>Rate Multiplier</InputLabel>
                <Input
                  value={rateMultiplierNew}
                  type="number"
                  onChange={this.setRateMultiplier}
                  endAdornment={
                    <InputAdornment position="end">%</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleCurveDialog}>Cancel</Button>
              <Button onClick={this.setDemandCurve} color="primary">
                Submit
              </Button>
            </DialogActions>
          </Dialog>

        </Fragment>) : ``}
      </div>
    );
  }
}
