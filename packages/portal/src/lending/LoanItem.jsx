import { Fragment } from "react";
import styled from "styled-components";
import MuiCard from "@material-ui/core/Card";
import MuiCardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import { fromBigNumber, toBigNumber } from "../common/utils";

import OrderItem from "../orders/OrderHistory/OrderItem";

import { getSymbol, getDecimals } from "../common/tokens";
import { COLORS } from "../styles/constants";

import WithdrawInterest from "./WithdrawInterest";

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

// const LowerUpperRight = styled.div`
//   position: absolute;
//   top: 72px;
//   right: 16px;
// `;

export default class LoanItem extends BZxComponent {
  state = {
    showOrderDialog: false,
    order: undefined,
    interestPaid: toBigNumber(0),
    interestUnPaid: toBigNumber(0)
  };
  
  async componentWillReceiveProps(nextProps) {
    if (nextProps.data.ts !== this.props.data.ts)
      await this.getLenderInterest();
  }
  
  componentDidMount = async () => {
    await this.getLenderInterest();
  };

  getLenderInterest = async () => {
    const { bZx, data } = this.props;
    const lenderInterest = await this.wrapAndRun(bZx.getLenderInterestForOrder({
      loanOrderHash: data.loanOrderHash
    }));
    console.log(`lenderInterest`,lenderInterest);
    await this.setState({ 
      interestPaid: lenderInterest.interestPaid,
      interestUnPaid: lenderInterest.interestUnPaid,
    });
  };

  getSingleOrder = async loanOrderHash => {
    const { bZx } = this.props;
    const order = await this.wrapAndRun(bZx.getSingleOrder({
      loanOrderHash
    }));
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

  render() {
    const { 
      tokens,
      bZx,
      accounts,
      web3,
      currentFee
    } = this.props;
    const {
      interestPaid,
      interestUnPaid
    } = this.state;    
    const {
      collateralTokenAmountFilled,
      collateralTokenAddressFilled,
      interestTokenAddress,
      loanTokenAddress,
      positionTokenAddressFilled,
      positionTokenAmountFilled,
      loanOrderHash,
      trader,
      loanStartUnixTimestampSec,
      active
    } = this.props.data;


    const collateralTokenSymbol = getSymbol(
      tokens,
      collateralTokenAddressFilled
    );
    const loanTokenSymbol = getSymbol(tokens, loanTokenAddress);
    const interestTokenSymbol = getSymbol(tokens, interestTokenAddress);
    const positionTokenSymbol = getSymbol(tokens, positionTokenAddressFilled);

    const collateralTokenDecimals = getDecimals(
      tokens,
      collateralTokenAddressFilled
    );
    const loanTokenDecimals = getDecimals(tokens, loanTokenAddress);
    const interestTokenDecimals = getDecimals(tokens, interestTokenAddress);
    const positionTokenDecimals = getDecimals(
      tokens,
      positionTokenAddressFilled
    );

    const loanOpenedDate = new Date(loanStartUnixTimestampSec * 1000);
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
            <Label>Borrower </Label>
            <DataPoint title={trader}>
              <Hash
                href={`${bZx.etherscanURL}address/${trader}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {trader}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          {/* this.props.closed ? (
            <UpperRight>
              <Label>Loan Closed</Label>
              <div title={loanClosedDate.toUTCString()}>
                {loanClosedDate.toLocaleString()}
              </div>
            </UpperRight>
          ) : (
            <UpperRight>
              <Label>Loan Opened</Label>
              <div title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </div>
            </UpperRight>
          ) */}

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
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {fromBigNumber(positionTokenAmountFilled, 10 ** loanTokenDecimals)}
              {` `}
              {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          {/*<DataPointContainer>
            <Label>Trade Amount</Label>
            <DataPoint>
              {fromBigNumber(
                positionTokenAmountFilled,
                10 ** positionTokenDecimals
              )}
              {` `}
              {positionTokenSymbol}
            </DataPoint>
            </DataPointContainer>*/}

          {active ? (
            <Fragment>
              <br />
              
              <DataPointContainer>
                <Label>Interest Paid (all loan total)</Label>
                <DataPoint>
                  {fromBigNumber(interestPaid, 10 ** interestTokenDecimals)}
                  {` `}
                  {interestTokenSymbol}
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Withdrawable Interest (all loan total)</Label>
                <DataPoint style={{ marginRight: `12px` }}>
                  {fromBigNumber(
                    interestUnPaid,
                    10 ** interestTokenDecimals
                  )}
                  {` `}
                  {interestTokenSymbol}
                </DataPoint>
              </DataPointContainer>

              <div style={{ marginTop: `12px` }}>
                <WithdrawInterest
                  bZx={bZx}
                  trader={trader}
                  availableForWithdrawal={interestUnPaid}
                  symbol={interestTokenSymbol}
                  decimals={interestTokenDecimals}
                  accounts={accounts}
                  web3={web3}
                  loanOrderHash={loanOrderHash}
                  currentFee={currentFee}
                />
              </div>
            </Fragment>
          ) : (
            <Fragment>
              <DataPointContainer>
                <Label>Interest earned (all loan total)</Label>
                <DataPoint>
                  {fromBigNumber(interestPaid, 10 ** interestTokenDecimals)}
                  {` `}
                  {interestTokenSymbol}
                </DataPoint>
              </DataPointContainer>
            </Fragment>
          )}



          {/* this.props.closed && <br /> */}

          {/* this.props.closed && (
            <DataPointContainer>
              <Label>Loan Opened</Label>
              <DataPoint title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </DataPoint>
            </DataPointContainer>
          ) */}
        </CardContent>
      </Card>
    );
  }
}
