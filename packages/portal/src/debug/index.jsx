import { Fragment } from "react";
import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import BZxComponent from "../common/BZxComponent";
import { Divider } from "../common/FormSection";
import { COLORS } from "../styles/constants";
import { fromBigNumber, toBigNumber } from "../common/utils";
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

export default class Debug extends BZxComponent {
  state = { 
    loading: false, 
    error: false,
    bzxContract: null,
    order: null,
    position: null,
    newHash: ``,
    newTrader: ``,
    showLoanDialog: false,
  };

  async componentDidMount() {

    let bzxAddress;

    /** TEMP **/
    bzxAddress = (await this.props.bZx.getWeb3Contract(`BZx`))._address;
    /** TEMP **/

    const bzxContract = await this.props.bZx.getWeb3Contract(`BZx`, bzxAddress);
    console.log(`bzx contract:`, bzxContract._address);

    await this.setState({ 
      bzxContract
    });

    await this.refreshLoanData();
  }

  async componentWillReceiveProps(nextProps) {
    console.log(`nextProps`,nextProps);
    if (nextProps.currentHash !== this.props.currentHash || nextProps.currentTrader !== this.props.currentTrader)
      await this.refreshLoanData();
  }

  refreshLoanData = async () => {
    const { web3, accounts, currentHash, currentTrader } = this.props;
    const { bzxContract } = this.state;

    await this.setState({ 
      newHash: this.props.currentHash, 
      newTrader: this.props.currentTrader
    });

    if (!currentHash) {
      return;
    }

    await this.setState({ loading: true });

    //console.log(`Token contract:`, tokenContract._address);
    let orderFilledAmounts, orderCancelledAmounts;
    let lenderInterestForOracle, lenderInterestForOrder, traderInterestForLoan;

    try {
      let order = {};
      if (currentHash) {
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
        const orderArr = await this.wrapAndRun(bzxContract.methods.getLoanOrder(currentHash).call());

        for(var i=0; i < orderKeys.length; i++) {
          order[orderKeys[i]] = orderArr[i];
        }

        order[`loanTokenAmount`] = toBigNumber(order[`loanTokenAmount`], 10 ** -18).toString() + ` (normalized)`;
        order[`interestAmount`] = toBigNumber(order[`interestAmount`], 10 ** -18).toString()+ ` (normalized)`;

        orderFilledAmounts = await this.wrapAndRun(bzxContract.methods.orderFilledAmounts(currentHash).call());
        orderCancelledAmounts = await this.wrapAndRun(bzxContract.methods.orderCancelledAmounts(currentHash).call());
      }

      let orderAux = {};
      if (currentHash) {
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
        const orderAuxArr = await this.wrapAndRun(bzxContract.methods.getLoanOrderAux(currentHash).call());

        for(var i=0; i < orderAuxKeys.length; i++) {
          orderAux[orderAuxKeys[i]] = orderAuxArr[i];
        }

        //order[`loanTokenAmount`] = toBigNumber(order[`loanTokenAmount`], 10 ** -18).toString() + ` (normalized)`;
        //order[`interestAmount`] = toBigNumber(order[`interestAmount`], 10 ** -18).toString()+ ` (normalized)`;
      }

      let position = {};
      if (currentHash && currentTrader) {
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
          await this.wrapAndRun(bzxContract.methods.loanPositionsIds(currentHash, currentTrader).call())
        ).call());

        for(var i=0; i < positionKeys.length; i++) {
          position[positionKeys[i]] = positionArr[i];
        }

        position[`loanTokenAmountFilled`] = toBigNumber(position[`loanTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
        position[`collateralTokenAmountFilled`] = toBigNumber(position[`collateralTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
        position[`positionTokenAmountFilled`] = toBigNumber(position[`positionTokenAmountFilled`], 10 ** -18).toString()+ ` (normalized)`;
      
      
        lenderInterestForOrder = await this.wrapAndRun(bzxContract.methods.getLenderInterestForOrder(
          currentHash
        ).call());
        lenderInterestForOrder = {
          lender: lenderInterestForOrder[0],
          interestTokenAddress: lenderInterestForOrder[1],
          interestPaid: toBigNumber(lenderInterestForOrder[2], 10 ** -18).toString()+ ` (normalized)`,
          interestPaidDate: lenderInterestForOrder[3],
          interestOwedPerDay: toBigNumber(lenderInterestForOrder[4], 10 ** -18).toString()+ ` (normalized)`,
          interestUnPaid: toBigNumber(lenderInterestForOrder[5], 10 ** -18).toString()+ ` (normalized)`
        };

        lenderInterestForOracle = await this.wrapAndRun(bzxContract.methods.getLenderInterestForOracle(
          lenderInterestForOrder[`lender`],
          order[`oracleAddress`],
          order[`interestTokenAddress`]
        ).call());
        lenderInterestForOracle = {
          interestPaid: toBigNumber(lenderInterestForOracle[0], 10 ** -18).toString()+ ` (normalized)`,
          interestPaidDate: lenderInterestForOracle[1],
          interestOwedPerDay: toBigNumber(lenderInterestForOracle[2], 10 ** -18).toString()+ ` (normalized)`,
          interestUnPaid: toBigNumber(lenderInterestForOracle[3], 10 ** -18).toString()+ ` (normalized)`
        };

        traderInterestForLoan = await this.wrapAndRun(bzxContract.methods.getTraderInterestForLoan(
          currentHash,
          position[`trader`]
        ).call());
        traderInterestForLoan = {
          interestTokenAddress: traderInterestForLoan[0],
          interestOwedPerDay: toBigNumber(traderInterestForLoan[1], 10 ** -18).toString()+ ` (normalized)`,
          interestPaidTotal: toBigNumber(traderInterestForLoan[2], 10 ** -18).toString()+ ` (normalized)`,
          interestDepositTotal: toBigNumber(traderInterestForLoan[3], 10 ** -18).toString()+ ` (normalized)`,
          interestDepositRemaining: toBigNumber(traderInterestForLoan[4], 10 ** -18).toString()+ ` (normalized)`
        };
      }

      await this.setState({ 
        loading: false, 
        error: false,
        order,
        orderAux,
        position,
        orderFilledAmounts,
        orderCancelledAmounts,
        lenderInterestForOracle,
        lenderInterestForOrder,
        traderInterestForLoan
      });

    } catch(e) {
      console.log(e);
      this.setState({ 
        error: true, 
        loading: false
      });
    }

  }

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  toggleHashDialog = async () => {
    await this.setState(p => ({ showLoanDialog: !p.showLoanDialog }));
    if (!this.state.showLoanDialog && (this.state.newHash !== this.props.currentHash || this.state.newTrader !== this.props.currentTrader)) {
      await this.props.setCurrentLoan(this.props.currentHash, this.props.currentTrader);
      await this.refreshLoanData();
    }
  }

  // can only be called by the lender
  payInterestForOracle = async () => {
    const { web3, bZx, accounts } = this.props;
    const { bzxContract, order } = this.state;

    if (!bzxContract || !order)
      return;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bzxContract.methods.payInterestForOracle(
      order[`oracleAddress`],
      order[`interestTokenAddress`]
    );
    console.log(txOpts);

    try {
      console.log(txOpts);
      await txObj.send(txOpts)
        .once(`transactionHash`, hash => {
          alert(`Transaction submitted, transaction hash:`, {
            component: () => (
              <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                {hash}
              </TxHashLink>
            )
          });
          this.setState({ showReduceDialog: false });
        })
        .then(async () => {
          alert(`The txn is complete.`);
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ showReduceDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ showReduceDialog: false });
    }
  };

  payInterestForOrder = async () => {
    const { web3, bZx, accounts } = this.props;
    const { bzxContract, order } = this.state;

    if (!bzxContract || !order)
      return;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bzxContract.methods.payInterestForOrder(
      order[`loanOrderHash`]
    );
    console.log(txOpts);

    try {
      console.log(txOpts);
      await txObj.send(txOpts)
        .once(`transactionHash`, hash => {
          alert(`Transaction submitted, transaction hash:`, {
            component: () => (
              <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                {hash}
              </TxHashLink>
            )
          });
          this.setState({ showReduceDialog: false });
        })
        .then(async () => {
          alert(`The txn is complete.`);
        })
        .catch(error => {
          console.error(error.message);
          alert(`The txn did not complete.`);
          this.setState({ showReduceDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      alert(`The txn did not complete.`);
      this.setState({ showReduceDialog: false });
    }
  };

  render() {
    const { 
      loading,
      error,
      order,
      orderAux,
      position,
      orderFilledAmounts,
      orderCancelledAmounts,
      lenderInterestForOracle,
      lenderInterestForOrder,
      traderInterestForLoan
    } = this.state;
    const { bZx, currentHash, currentTrader } = this.props; 
    if (error) {
      return (
        <div>
          <InfoContainer>
            <ShowInfo>Web3 error loading. Please refresh in a few minutes.</ShowInfo>
            <Button onClick={this.refreshLoanData} variant="raised" disabled={false}>
              Refresh
            </Button>
          </InfoContainer>
        </div>
      );
    }

    return (
      <div>

        {bZx.networkId === 50 ? ( <Fragment>
            <p>
              concert load couple harbor equip island argue ramp clarify fence smart topic
            </p>
            <Divider />
        </Fragment> ) : ``}

        <InfoContainer style={{ display: `block` }}>
          <DataPointContainer>
            <Button
              variant="raised"
              color="primary"
              onClick={this.toggleHashDialog}
              style={{ marginLeft: `12px` }}
            >
              Update Loan
            </Button>
            { currentHash ? ( <Button
              onClick={this.refreshLoanData}
              variant="raised"
              disabled={loading}
            >
              {loading ? `Refreshing...` : `Refresh`}
            </Button> ) : ``}
          </DataPointContainer>
          { currentHash ? ( <DataPointContainer>
            <Label>currentHash</Label>
            <DataPoint>
              {currentHash}
            </DataPoint>
          </DataPointContainer> ) : `` }
        </InfoContainer>
        <br/>

        {lenderInterestForOracle ? (
        <Fragment>
          <DataPointContainer>
            <Button
              variant="raised"
              color="primary"
              onClick={this.payInterestForOracle}
              style={{ marginLeft: `12px` }}
            >
              Pay Interest For Oracle
            </Button>
            <Button
              variant="raised"
              color="primary"
              onClick={this.payInterestForOrder}
              style={{ marginLeft: `12px` }}
            >
              Pay Interest For Order
            </Button>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Lender Interest For Oracle</Label>
            <DataPoint>
              <pre>{JSON.stringify(lenderInterestForOracle, null, '  ')}</pre>
            </DataPoint>
          </DataPointContainer>
        </Fragment> ) : ``}

        {lenderInterestForOrder ? (
        <DataPointContainer>
          <Label>Lender Interest For Order</Label>
          <DataPoint>
            <pre>{JSON.stringify(lenderInterestForOrder, null, '  ')}</pre>
          </DataPoint>
        </DataPointContainer>) : ``}

        {traderInterestForLoan ? (
        <DataPointContainer>
          <Label>Trader Interest For Loan</Label>
          <DataPoint>
            <pre>{JSON.stringify(traderInterestForLoan, null, '  ')}</pre>
          </DataPoint>
        </DataPointContainer>) : ``}

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

          </ShowInfo>
        </InfoContainer>
        <Dialog
          open={this.state.showLoanDialog}
          onClose={this.toggleHashDialog}
        >
          <DialogTitle>Loan Selection</DialogTitle>
          <DialogContent>
            <DialogContentText>
            </DialogContentText>
            <br/>
            <FormControl fullWidth>
              <InputLabel>currentHash</InputLabel>
              <Input
                value={this.props.currentHash}
                //type="number"
                onChange={this.setStateForInput(`newHash`)}
              />
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Trader Address</InputLabel>
              <Input
                value={this.props.currentTrader}
                //type="number"
                onChange={this.setStateForInput(`newTrader`)}
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleHashDialog}>OK</Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
