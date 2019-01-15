import { Fragment } from "react";
import styled from "styled-components";
import MuiCard from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import MuiCardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import moment from "moment";

import LoanMaintenance from "./LoanMaintenance";
import TradeOptions from "./TradeOptions";
import CloseLoan from "./CloseLoan";

import OrderItem from "../orders/OrderHistory/OrderItem";

import { COLORS } from "../styles/constants";
import { getSymbol, getDecimals } from "../common/tokens";
import { toBigNumber, fromBigNumber, MAX_UINT } from "../common/utils";

import PositionExcess from "./PositionExcess";

import BZxComponent from "../common/BZxComponent";

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

const Hash = styled.a`
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

const UpperRight = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const LowerUpperRight = styled.div`
  position: absolute;
  top: 72px;
  right: 16px;
`;

export default class OpenedLoan extends BZxComponent {
  state = {
    showOrderDialog: false,
    loadingMargins: true,
    error: false,
    initialMarginAmount: null,
    maintenanceMarginAmount: null,
    currentMarginAmount: null,
    order: null,
    collateralExcess: null
  };

  componentDidMount = async () => {
    await this.getMarginLevels();
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.data &&
      JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)
    )
      this.getMarginLevels();
  }

  querying = false
  getSingleOrder = async () => {
    if (this.querying || this.state.order)
      return;
    this.querying = true;
    const { bZx } = this.props;
    const order = await this.wrapAndRun(bZx.getSingleOrder({
      loanOrderHash: this.props.data.loanOrderHash
    }));
    console.log(`Order data`, order);
    await this.setState({ order });
    this.querying = false;
  };

  getMarginLevels = async () => {
    const { tokens, bZx, data, accounts } = this.props;
    
    this.setState({ loadingMargins: true, error: false });

    try {
      await this.getSingleOrder();

      const marginLevels = await this.wrapAndRun(bZx.getMarginLevels({
        loanOrderHash: data.loanOrderHash,
        trader: data.trader
      }));
      console.log(marginLevels);

      const txOpts = {
        from: accounts[0],
        gas: 2000000,
        gasPrice: window.defaultGasPrice.toString()
      };
      const txObj = await bZx.withdrawCollateral({
        loanOrderHash: data.loanOrderHash,
        collateralTokenFilled: data.collateralTokenAddressFilled,
        withdrawAmount: MAX_UINT,
        getObject: true,
        txOpts
      });
      console.log(txOpts);

      let collateralExcess;
      try {
        collateralExcess = await this.wrapAndRun(txObj.call(txOpts));
        console.log(`collateralExcess`,collateralExcess);
      } catch(e) {
        collateralExcess = toBigNumber(0);
      }

      await this.setState({
        loadingMargins: false,
        initialMarginAmount: marginLevels.initialMarginAmount,
        maintenanceMarginAmount: marginLevels.maintenanceMarginAmount,
        currentMarginAmount: marginLevels.currentMarginAmount,
        collateralExcess
      });

    } catch(e) {
      console.log(e);
      this.setState({ error: true });
    }
  };

  toggleOrderDialog = async event => {
    event.preventDefault();
    this.setState(p => ({
      showOrderDialog: !p.showOrderDialog
    }));
  };

  render() {
    const { tokens, bZx, accounts, web3 } = this.props;
    const {
      collateralTokenAddressFilled,
      collateralTokenAmountFilled,
      positionTokenAddressFilled,
      positionTokenAmountFilled,
      interestTokenAddress,
      interestPaidTotal,
      interestDepositRemaining,
      loanTokenAmountFilled,
      loanTokenAddress,
      loanStartUnixTimestampSec,
      loanEndUnixTimestampSec,
      loanOrderHash,
      lender
    } = this.props.data;

    const {
      loadingMargins,
      error,
      initialMarginAmount,
      maintenanceMarginAmount,
      currentMarginAmount,
      order,
      collateralExcess
    } = this.state;

    const collateralToken = tokens.filter(
      t => t.address === collateralTokenAddressFilled
    )[0];
    const loanToken = tokens.filter(
      t => t.address === loanTokenAddress
    )[0];
    const positionToken = tokens.filter(
      t => t.address === positionTokenAddressFilled
    )[0];
    const collateralTokenSymbol = collateralToken.symbol;
    const loanTokenSymbol = loanToken.symbol;
    const interestTokenSymbol = getSymbol(tokens, interestTokenAddress);
    const positionTokenSymbol = positionToken.symbol;

    const collateralTokenDecimals = collateralToken.decimals;
    const loanTokenDecimals = loanToken.decimals;
    const interestTokenDecimals = getDecimals(tokens, interestTokenAddress);
    const positionTokenDecimals = positionToken.decimals;

    const tradeOpened = positionTokenAddressFilled !== loanTokenAddress;
    const loanOpenedDate = new Date(loanStartUnixTimestampSec * 1000);

    const loanExpireDate = moment(loanEndUnixTimestampSec * 1000).utc();
    const loanExpireDateStr = loanExpireDate.format(`MMMM Do YYYY, h:mm a UTC`);

    const collateralExcessConv = collateralExcess ? fromBigNumber(collateralExcess, 10 ** collateralTokenDecimals) : "0";

    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint title={loanOrderHash}>
              <Hash
                href="#"
                onClick={this.toggleOrderDialog}
                target="_blank"
                rel="noopener noreferrer"
                id={loanOrderHash}
              >
                {loanOrderHash}
              </Hash>
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
                  key={loanOrderHash}
                  bZx={bZx}
                  accounts={accounts}
                  tokens={tokens}
                  takenOrder={order}
                  noShadow
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={this.toggleOrderDialog}>OK</Button>
              </DialogActions>
            </Dialog>
          </DataPointContainer>
          <DataPointContainer>
            <Label>Lender </Label>
            <DataPoint title={lender}>
              <Hash
                href={`${bZx.etherscanURL}address/${lender}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lender}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <UpperRight>
            <Label>Loan Opened</Label>
            <div title={loanOpenedDate.toUTCString()}>
              {loanOpenedDate.toLocaleString()}
            </div>
          </UpperRight>

          <hr />

          <DataPointContainer>
            <Label>Collateral</Label>
            <DataPoint>
              {fromBigNumber(
                collateralTokenAmountFilled,
                10 ** collateralTokenDecimals
              )}
              {` `}
              {collateralTokenSymbol}
              {collateralExcess ? (
                <Fragment>
                  &nbsp;&nbsp;&nbsp;({collateralExcessConv} {collateralTokenSymbol} excess)
                </Fragment>
              ) : ``}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {fromBigNumber(loanTokenAmountFilled, 10 ** loanTokenDecimals)}
              {` `}
              {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest Paid</Label>
            <DataPoint>
              {fromBigNumber(interestPaidTotal, 10 ** interestTokenDecimals)}
              {` `}
              {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest Remaining</Label>
            <DataPoint>
              {fromBigNumber(interestDepositRemaining, 10 ** interestTokenDecimals)}
              {` `}
              {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <br />

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
                <DataPoint>
                  {`${loanExpireDateStr} (${loanExpireDate.fromNow()})`}
                </DataPoint>
              </DataPointContainer>
            </Fragment>
          )}

          <PositionExcess
            bZx={bZx}
            web3={web3}
            loanOrderHash={loanOrderHash}
            accounts={accounts}
            symbol={positionTokenSymbol}
            decimals={positionTokenDecimals}
            data={this.props.data}
            loanTokenSymbol={loanTokenSymbol}
          />

          <LowerUpperRight>
            <LoanMaintenance
              tokens={tokens}
              bZx={bZx}
              accounts={accounts}
              web3={web3}
              loanOrderHash={loanOrderHash}
              collateralToken={collateralToken}
              collateralTokenDecimals={collateralToken}
              collateralExcess={collateralExcessConv}
              positionToken={positionToken}
              currentMarginAmount={currentMarginAmount}
              positionTokenAmountFilled={this.props.data.positionTokenAmountFilled}
              initialMarginAmount={this.state.initialMarginAmount}
            />
          </LowerUpperRight>
        </CardContent>

        <CardActions>
          <DataPointContainer style={{ marginLeft: `12px` }}>
            <Label>Active Trade</Label>
            <DataPoint>{Boolean(tradeOpened).toString()}</DataPoint>
          </DataPointContainer>

          <DataPointContainer style={{ marginLeft: `12px` }}>
            <Label>Position Amount</Label>
            <DataPoint>
              {fromBigNumber(
                positionTokenAmountFilled,
                10 ** positionTokenDecimals
              )}
              {` `}
              {positionTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <TradeOptions
            tokens={tokens}
            bZx={bZx}
            accounts={accounts}
            web3={web3}
            loanOrderHash={loanOrderHash}
            order={order}
            getSingleOrder={this.getSingleOrder}
            positionTokenAddressFilled={positionTokenAddressFilled}
            positionTokenAmountFilled={positionTokenAmountFilled}
          />
          <CloseLoan
            bZx={bZx}
            accounts={accounts}
            web3={web3}
            loanOrderHash={loanOrderHash}
            loanToken={loanToken}
            loanTokenAmountFilled={loanTokenAmountFilled}
          />
        </CardActions>
      </Card>
    );
  }
}
