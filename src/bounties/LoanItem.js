import { Fragment } from "react";
import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import moment from "moment";
import Button from "material-ui/Button";
import Dialog, { DialogActions, DialogContent } from "material-ui/Dialog";
import BigNumber from "bignumber.js";

import OrderItem from "../orders/OrderHistory/OrderItem";

import { fromBigNumber } from "../common/utils";

import { COLORS } from "../styles/constants";

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

export default class LoanItem extends React.Component {
  state = {
    loadingMargins: true,
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
    this.setState({ loadingMargins: true });
    const marginLevels = await bZx.getMarginLevels({
      loanOrderHash: data.loanOrderHash,
      trader: data.trader
    });
    console.log(marginLevels);
    this.setState({
      loadingMargins: false,
      initialMarginAmount: marginLevels.initialMarginAmount,
      maintenanceMarginAmount: marginLevels.maintenanceMarginAmount,
      currentMarginAmount: marginLevels.currentMarginAmount
    });
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

  liquidate = () => {
    const { bZx, web3, accounts, data } = this.props;
    const { loanOrderHash, trader } = data;

    const txOpts = {
      from: accounts[0],
      // gas: 1000000, // gas estimated in b0x.js
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = bZx.liquidateLoan({
      loanOrderHash,
      trader,
      getObject: true
    });

    try {
      txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = gas;
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
    const { data, tokens, bZx, accounts } = this.props;
    const {
      loadingMargins,
      initialMarginAmount,
      maintenanceMarginAmount,
      currentMarginAmount
    } = this.state;
    const isUnSafe = !BigNumber(currentMarginAmount)
      .dividedBy(1e18)
      .plus(5) // start reporting "unsafe" when 5% above maintenance threshold
      .gt(maintenanceMarginAmount);
    const date = moment(data.expirationUnixTimestampSec * 1000).utc();
    const dateStr = date.format(`MMMM Do YYYY, h:mm a UTC`);
    const isExpired = moment(moment().utc()).isAfter(date);
    return (
      <Card>
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

          {loadingMargins ? (
            <DataPointContainer>Loading margin levels...</DataPointContainer>
          ) : (
            <Fragment>
              <DataPointContainer>
                <Label>Initial margin</Label>
                <DataPoint>{initialMarginAmount}%</DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Maintenance margin</Label>
                <DataPoint>{maintenanceMarginAmount}%</DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Current margin level</Label>
                <DataPoint>
                  {fromBigNumber(currentMarginAmount, 1e18)}%
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
              style={{ marginTop: `12px` }}
              variant="raised"
              onClick={this.liquidate}
              disabled={!isExpired && !isUnSafe}
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
