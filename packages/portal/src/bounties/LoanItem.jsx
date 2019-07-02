import { Fragment } from "react";
import styled from "styled-components";
import MuiCard from "@material-ui/core/Card";
import MuiCardContent from "@material-ui/core/CardContent";
import moment from "moment";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import BigNumber from "bignumber.js";

import OrderItem from "../orders/OrderHistory/OrderItem";

import { fromBigNumber } from "../common/utils";

import { COLORS } from "../styles/constants";

import BZxComponent from "../common/BZxComponent";

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
`;

const CardContent = styled(MuiCardContent)`
  position: relative;
`;

const Card = styled(MuiCard)`
  width: 100%;
  margin-bottom: 24px;
`;

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const HashLink = styled.a`
  display: inline-block;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  //text-overflow: ellipsis;
  //max-width: 20ch;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
`;

export default class LoanItem extends BZxComponent {
  state = {
    loadingMargins: true,
    error: false,
    initialMarginAmount: null,
    maintenanceMarginAmount: null,
    currentMarginAmount: null,
    showOrderDialog: false,
    order: undefined
  };

  componentDidMount = async () => {
    this.getMarginLevels();
  };

  getMarginLevels = async () => {
    const { bZx, data } = this.props;
    this.setState({ loadingMargins: true, error: false });
    try {
      const marginLevels = await this.wrapAndRun(bZx.getMarginLevels({
        loanOrderHash: data.loanOrderHash,
        trader: data.trader
      }));
      console.log(marginLevels);
      this.setState({
        loadingMargins: false,
        initialMarginAmount: marginLevels.initialMarginAmount,
        maintenanceMarginAmount: marginLevels.maintenanceMarginAmount,
        currentMarginAmount: marginLevels.currentMarginAmount
      });
    } catch(e) {
      console.log(e);
      this.setState({ error: true, loading: false });
    }
  };

  getSingleOrder = async loanOrderHash => {
    const { bZx } = this.props;
    const order = await bZx.getSingleOrder({
      loanOrderHash
    });
    return order;
  };

  toggleOrderDialog = async event => {
    event.preventDefault();
    if (event.target.id !== ``) {
      const order = await this.getSingleOrder(event.target.id);
      this.setState(p => ({
        showOrderDialog: !p.showOrderDialog,
        order
      }));
    } else {
      this.setState(p => ({
        showOrderDialog: !p.showOrderDialog
      }));
    }
  };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  debugLoan = () => {
    this.props.setCurrentLoan(this.props.data.loanOrderHash, this.props.data.trader);
    this.props.changeCard(`debug`);
  }

  liquidate = () => {
    const { bZx, web3, accounts, data } = this.props;
    const { loanOrderHash, trader } = data;

    const txOpts = {
      from: accounts[0],
      gas: 4000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    console.log(txOpts);

    const txObj = bZx.liquidateLoan({
      loanOrderHash,
      trader,
      liquidateAmount: "0", // full position
      getObject: true
    });

    try {
      txObj
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
            })
            .then(() => {
              alert(`Loan liquidation complete.`);
            })
            .catch(error => {
              console.error(error);
              alert(`We were not able to liquidate this loan.`);
            });
        })
        .catch(error => {
          console.error(error);
          alert(
            `The transaction is failing. This loan cannot be liquidated at this time.`
          );
        });
    } catch (error) {
      console.error(error);
      alert(
        `The transaction is failing. This loan cannot be liquidated at this time.`
      );
    }
  };

  render() {
    const { data, tokens, bZx, accounts, showAll } = this.props;
    const {
      loadingMargins,
      error,
      initialMarginAmount,
      maintenanceMarginAmount,
      currentMarginAmount
    } = this.state;
    const isUnSafe = currentMarginAmount ? !BigNumber(currentMarginAmount)
      .gt(maintenanceMarginAmount) : false;
    const date = moment(data.loanEndUnixTimestampSec * 1000).utc();
    const dateStr = date.format(`MMMM Do YYYY, h:mm a UTC`);
    const isExpired = moment(moment().utc()).isAfter(date);
    return (
      <Card style={{ display: !showAll && !loadingMargins && !error && !isExpired && !isUnSafe ? `none` : `` }}>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint title={data.loanOrderHash}>
              <HashLink
                href="#"
                onClick={this.toggleOrderDialog}
                target="_blank"
                rel="noopener noreferrer"
                id={data.loanOrderHash}
              >
                {data.loanOrderHash}
              </HashLink>
            </DataPoint>
            <Dialog
              open={this.state.showOrderDialog}
              onClose={this.toggleOrderDialog}
              // style={{width: `1000px`}}
              fullWidth
              maxWidth="md"
            >
              <DialogContent>
                <OrderItem
                  key={data.loanOrderHash}
                  bZx={bZx}
                  accounts={accounts}
                  tokens={tokens}
                  takenOrder={this.state.order}
                  noShadow
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={this.toggleOrderDialog}>OK</Button>
              </DialogActions>
            </Dialog>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Trader </Label>
            <DataPoint>
              <HashLink
                href={`${bZx.etherscanURL}address/${data.trader}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.trader}
              </HashLink>
            </DataPoint>
          </DataPointContainer>

          {loadingMargins && !error ? (
            <DataPointContainer>Loading margin levels...</DataPointContainer>
          ) : 
          error ? (
            <DataPointContainer>Web3 error loading margin. Please refresh in a few minutes.</DataPointContainer>
          ) : 
          (
            <Fragment>
              <DataPointContainer>
                <Label>Initial margin</Label>
                <DataPoint>{Math.round(100*fromBigNumber(initialMarginAmount, 1e18))/100}%</DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Maintenance margin</Label>
                <DataPoint>{Math.round(100*fromBigNumber(maintenanceMarginAmount, 1e18))/100}%</DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Current margin level</Label>
                <DataPoint>
                  {Math.round(100*fromBigNumber(currentMarginAmount, 1e18))/100}%
                </DataPoint>
              </DataPointContainer>

              <br />

              <DataPointContainer>
                <Label>Expires</Label>
                <DataPoint>{`${dateStr} (${date.fromNow()})`}</DataPoint>
              </DataPointContainer>
            </Fragment>
          )}

          <DataPointContainer>
            <Button
              style={{ marginTop: `12px`, marginRight: `12px` }}
              variant="raised"
              onClick={this.debugLoan}
            >
              Advanced
            </Button>
            
            <Button
              style={{ marginTop: `12px` }}
              variant="raised"
              onClick={this.liquidate}
              disabled={bZx.networkId !== 50 && !isExpired && !isUnSafe}
            >
              Liquidate
            </Button>
            <DataPoint style={{ marginTop: `12px` }}>
              {isExpired // eslint-disable-line no-nested-ternary
                ? `Loan is Expired`
                : isUnSafe
                  ? `Loan is Unsafe`
                  : `Loan is Safe`}
            </DataPoint>
          </DataPointContainer>
        </CardContent>
      </Card>
    );
  }
}
