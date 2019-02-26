import { Fragment } from "react";
import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import BZxComponent from "../../common/BZxComponent";
import { Divider } from "../../common/FormSection";
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

export default class DebugTokenization extends BZxComponent {
  state = { 
    loading: false, 
    error: false,
    iTokenContract: null,
    pTokenContract: null,
    bzxContract: null,
    showRatesDialog: false,
    rates: 0,
    order: null,
    position: null,
    currentRate: 0
  };

  async componentDidMount() {
    /*
    let iTokenAddress = (await this.props.bZx.getWeb3Contract(`LoanToken`))._address;

    const iTokenContract = await this.props.bZx.getWeb3Contract(`LoanToken`, iTokenAddress);
    console.log(`iToken contract:`, iTokenContract._address);


    let pTokenAddress = (await this.props.bZx.getWeb3Contract(`PositionToken`))._address;

    const pTokenContract = await this.props.bZx.getWeb3Contract(`PositionToken`, pTokenAddress);
    console.log(`pToken contract:`, pTokenContract._address);
    */

    let bzxAddress;

    /** TEMP **/
    bzxAddress = (await this.props.bZx.getWeb3Contract(`BZx`))._address;
    /** TEMP **/

    const bzxContract = await this.props.bZx.getWeb3Contract(`BZx`, bzxAddress);
    console.log(`bzx contract:`, bzxContract._address);

    await this.setState({ 
      //iTokenContract,
      //pTokenContract,
      bzxContract
    });
  }

  refreshTokenData = async () => {
    const { web3, accounts } = this.props;
    const { tokenContract, bzxContract } = this.state;
    await this.setState({ loading: true });
    
    //console.log(`Token contract:`, tokenContract._address);
    let orderFilledAmounts, orderCancelledAmounts;

    try {
      /*
      let order = {};
      if (this.props.CurrentHash) {
        const orderKeys = [
          `loanTokenAddress`,
          `interestTokenAddress`,
          `collateralTokenAddress`,
          `oracleAddress`,
          `loanTokenAmount`,
          `interestAmount`,
          `initialMarginAmount`,
          `maintenanceMarginAmount`,
          `maxDurationUnixTimestampSec`,
          `loanOrderHash`,
        ]
        const orderArr = await this.wrapAndRun(bzxContract.methods.getLoanOrder(this.props.CurrentHash).call());

        for(var i=0; i < orderKeys.length; i++) {
          order[orderKeys[i]] = orderArr[i];
        }

        order[`loanTokenAmount`] = toBigNumber(order[`loanTokenAmount`], 10 ** -18).toString() + ` (normalized)`;
        order[`interestAmount`] = toBigNumber(order[`interestAmount`], 10 ** -18).toString()+ ` (normalized)`;

        orderFilledAmounts = await this.wrapAndRun(bzxContract.methods.orderFilledAmounts(this.props.CurrentHash).call());
        orderCancelledAmounts = await this.wrapAndRun(bzxContract.methods.orderCancelledAmounts(this.props.CurrentHash).call());
      }

      console.log(`this.props.CurrentHash, this.props.CurrentTrader`, this.props.CurrentHash, this.props.CurrentTrader);

      let orderAux = {};
      if (this.props.CurrentHash) {
        const orderAuxKeys = [
          `makerAddress`,
          `takerAddress`,
          `feeRecipientAddress`,
          `tradeTokenToFillAddress`,
          `lenderRelayFee`,
          `traderRelayFee`,
          `makerRole`,
          `expirationUnixTimestampSec`,
          `withdrawOnOpen`,
          `description`,
        ]
        const orderAuxArr = await this.wrapAndRun(bzxContract.methods.getLoanOrderAux(this.props.CurrentHash).call());

        for(var i=0; i < orderAuxKeys.length; i++) {
          orderAux[orderAuxKeys[i]] = orderAuxArr[i];
        }

        //order[`loanTokenAmount`] = toBigNumber(order[`loanTokenAmount`], 10 ** -18).toString() + ` (normalized)`;
        //order[`interestAmount`] = toBigNumber(order[`interestAmount`], 10 ** -18).toString()+ ` (normalized)`;
      }

      let position = {};
      if (this.props.CurrentHash && this.props.CurrentTrader) {
        const positionKeys = [
          `trader`,
          `collateralTokenAddressFilled`,
          `positionTokenAddressFilled`,
          `loanTokenAmountFilled`,
          `loanTokenAmountUsed`,
          `collateralTokenAmountFilled`,
          `positionTokenAmountFilled`,
          `loanStartUnixTimestampSec`,
          `loanEndUnixTimestampSec`,
          `active`,
          `positionId`,
        ]
        const positionArr = await this.wrapAndRun(bzxContract.methods.getLoanPosition(
          await this.wrapAndRun(bzxContract.methods.loanPositionsIds(this.props.CurrentHash, this.props.CurrentTrader).call())
        ).call());

        for(var i=0; i < positionKeys.length; i++) {
          position[positionKeys[i]] = positionArr[i];
        }

        position[`loanTokenAmountFilled`] = toBigNumber(position[`loanTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
        position[`collateralTokenAmountFilled`] = toBigNumber(position[`collateralTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
        position[`positionTokenAmountFilled`] = toBigNumber(position[`positionTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
      }
      */

      const TradeToken = await this.props.bZx.getWeb3Contract(`TestToken9`);
      const LoanedToken = await this.props.bZx.getWeb3Contract(`WETH`);
      const oracleContract = await this.props.bZx.getWeb3Contract(`BZxOracle`);
      const currentRateObj = await this.wrapAndRun(oracleContract.methods.getTradeData(
        TradeToken._address,
        LoanedToken._address,
        toBigNumber(1, 1e18).toString()
      ).call());
      const currentRate = await toBigNumber(currentRateObj.sourceToDestRate, 10 ** -18).toString();

      await this.setState({ 
        loading: false, 
        error: false,
        /*order,
        orderAux,
        position,
        orderFilledAmounts,
        orderCancelledAmounts,*/
        currentRate
      });

    } catch(e) {
      console.log(e);
      this.setState({ 
        error: true, 
        loading: false
      });
    }

  }

  setRates = e => this.setState({ rates: e.target.value });

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  toggleRatesDialog = () =>
    this.setState(p => ({ showRatesDialog: !p.showRatesDialog }));

  changeRates = async () => {
    const { web3, bZx, accounts } = this.props;
    const { rates } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const oracleContract = await this.props.bZx.getWeb3Contract(`BZxOracle`);

    const txOpts = {
      to: oracleContract._address,
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const TradeToken = await this.props.bZx.getWeb3Contract(`TestToken9`);
    const LoanedToken = await this.props.bZx.getWeb3Contract(`WETH`);

    txOpts.data = web3.eth.abi.encodeFunctionSignature('setRates(address,address,uint256)') +
      web3.eth.abi.encodeParameters(['address','address','uint256'], [TradeToken._address,LoanedToken._address,toBigNumber(rates, 10 ** 18).toString()]).substr(2);
    console.log(txOpts);

    try {
      console.log(txOpts);
      await web3.eth.sendTransaction(txOpts)
        .once(`transactionHash`, hash => {
          alert(`Transaction submitted, transaction hash:`, {
            component: () => (
              <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                {hash}
              </TxHashLink>
            )
          });
          this.setState({ showRatesDialog: false });
        })
        .then(async () => {
          alert(`The txn is complete.`);
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ showRatesDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ showRatesDialog: false });
    }
  };

  halveRate = async () => {
    const { web3, bZx, accounts } = this.props;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    await this.refreshTokenData();

    const oracleContract = await this.props.bZx.getWeb3Contract(`BZxOracle`);

    const txOpts = {
      to: oracleContract._address,
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const TradeToken = await this.props.bZx.getWeb3Contract(`TestToken9`);
    const LoanedToken = await this.props.bZx.getWeb3Contract(`WETH`);

    txOpts.data = web3.eth.abi.encodeFunctionSignature('setRates(address,address,uint256)') +
      web3.eth.abi.encodeParameters(['address','address','uint256'], [TradeToken._address,LoanedToken._address,toBigNumber(this.state.currentRate, 10 ** 18).div(2).toString()]).substr(2);
    console.log(txOpts);

    try {
      console.log(txOpts);
      await web3.eth.sendTransaction(txOpts)
        .once(`transactionHash`, hash => {
          alert(`Transaction submitted, transaction hash:`, {
            component: () => (
              <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                {hash}
              </TxHashLink>
            )
          });
          this.setState({ showRatesDialog: false });
        })
        .then(async () => {
          alert(`The txn is complete.`);
          await this.refreshTokenData();
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ showRatesDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ showRatesDialog: false });
    }
  };


  render() {
    const { 
      loading,
      error,
      iTokenContract,
      order,
      orderAux,
      position,
      orderFilledAmounts,
      orderCancelledAmounts,
      currentRate
    } = this.state;
    const { bZx } = this.props; 
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

    return (
      <div>

        {bZx.networkId === `50` ? ( <Fragment>
            <p>
              concert load couple harbor equip island argue ramp clarify fence smart topic
            </p>
            <Divider />
        </Fragment> ) : ``}

        {bZx.networkId == 50 ? ( <Fragment>
          <InfoContainer style={{ display: `block` }}>
            <DataPointContainer>
              <Label>Conversion Rate</Label>
              <DataPoint>
                {currentRate ? currentRate : `[refresh]`}
              </DataPoint>
            </DataPointContainer>
            <DataPointContainer>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleRatesDialog}
                style={{ marginLeft: `12px` }}
              >
                Change Conversion Rate
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.halveRate}
                style={{ marginLeft: `12px` }}
              >
                Halve Conversion Rate
              </Button>
            </DataPointContainer>
          </InfoContainer>
          <br/>
        </Fragment> ) : ``}

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

            <DataPointContainer>

              {this.state.orderFilledAmounts && this.state.orderCancelledAmounts ? (
                <Fragment>
                  <pre>
                    {JSON.stringify({ 
                      "orderFilledAmount": toBigNumber(
                        orderFilledAmounts,
                        10 ** -18
                      ).toString()+` (normalized)`,
                      "orderCancelledAmount": toBigNumber(
                        orderCancelledAmounts,
                        10 ** -18
                      ).toString()+` (normalized)`
                    }, null, '  ')}
                  </pre>
                </Fragment>
              ) : ``}
              
            </DataPointContainer>
          {/*
            <DataPointContainer>

              {this.state.order ? (
                <Fragment>
                  <pre>
                    {JSON.stringify(order, null, '  ')}
                  </pre>
                </Fragment>
              ) : ``}
              
            </DataPointContainer>

            <DataPointContainer>

              {this.state.orderAux ? (
                <Fragment>
                  <pre>
                    {JSON.stringify(orderAux, null, '  ')}
                  </pre>
                </Fragment>
              ) : ``}
              
            </DataPointContainer>

            <DataPointContainer>

              {this.state.position ? (
                <Fragment>
                  <pre>
                    {JSON.stringify(position, null, '  ')}
                  </pre>
                </Fragment>
              ) : ``}
            
            </DataPointContainer>
          */}
          </ShowInfo>
        </InfoContainer>
        <Dialog
          open={this.state.showRatesDialog}
          onClose={this.toggleRatesDialog}
        >
          <DialogTitle>Conversion Rate</DialogTitle>
          <DialogContent>
            <DialogContentText>
            </DialogContentText>
            <br/>
            <FormControl fullWidth>
              <InputLabel>Conversion Rate</InputLabel>
              <Input
                value={this.state.rates}
                type="number"
                onChange={this.setRates}
                endAdornment={
                  <InputAdornment position="end"> </InputAdornment>
                }
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleRatesDialog}>Cancel</Button>
            <Button onClick={this.changeRates} color="primary">
              Submit
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
