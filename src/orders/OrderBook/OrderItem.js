import { Fragment } from "react";
import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import MuiButton from "material-ui/Button";
import moment from "moment";
import { BigNumber } from "bignumber.js";
import { COLORS } from "../../styles/constants";
import { fromBigNumber } from "../../common/utils";
import { getSymbol } from "../../common/tokens";

const CardContent = styled(MuiCardContent)`
  position: relative;
`;

const Card = styled(MuiCard)`
  width: 100%;
  margin-bottom: 24px;
`;

const Pre = styled.pre`
  overflow: auto;
  background: #ddd;
  padding: 12px;
`;

const IndentedContainer = styled.div`
  margin-left: 16px;
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

const Hash = styled.span`
  font-family: monospace;
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

export default class OrderItem extends React.Component {
  // state = { loanPositions: [] };
  state = { showRawOrder: false };

  async componentDidMount() {
    // const { bZx, accounts } = this.props;
    // const loanPositions = await bZx.getLoanPositions({
    //   loanPartyAddress: accounts[0].toLowerCase(),
    //   start: 0,
    //   count: 10
    // });
    // console.log(`loanPositions`, loanPositions);
    // this.setState({ loanPositions });
  }

  toggleShowRawOrder = () =>
    this.setState(p => ({ showRawOrder: !p.showRawOrder }));

  render() {
    const { fillableOrder, accounts, tokens, noShadow, changeTab } = this.props;
    const { showRawOrder } = this.state;
    // const { loanPositions } = this.state;

    const isMaker = fillableOrder.maker === accounts[0].toLowerCase();
    // const isLender = fillableOrder.lender === accounts[0].toLowerCase();
    const date = moment(fillableOrder.expirationUnixTimestampSec * 1000).utc();
    const dateStr = date.format(`MMMM Do YYYY, h:mm a UTC`);
    const addedDate = moment(fillableOrder.addedUnixTimestampSec * 1000).utc();
    const addedDateStr = addedDate.format(`MMMM Do YYYY, h:mm a UTC`);

    fillableOrder.loanTokenAmount = BigNumber(
      fillableOrder.loanTokenAmount
    ).toFixed(0);
    fillableOrder.orderFilledAmount = BigNumber(
      fillableOrder.orderFilledAmount
    ).toFixed(0);
    fillableOrder.orderCancelledAmount = BigNumber(
      fillableOrder.orderCancelledAmount
    ).toFixed(0);
    fillableOrder.interestAmount = BigNumber(
      fillableOrder.interestAmount
    ).toFixed(0);
    fillableOrder.lenderRelayFee = BigNumber(
      fillableOrder.lenderRelayFee
    ).toFixed(0);
    fillableOrder.traderRelayFee = BigNumber(
      fillableOrder.traderRelayFee
    ).toFixed(0);

    const fillsStr =
      fillableOrder.orderTraderCount +
      (fillableOrder.orderTraderCount === 1 ? ` trader` : ` traders`);

    const loanTokenSymbol = getSymbol(tokens, fillableOrder.loanTokenAddress);
    const interestTokenSymbol = getSymbol(
      tokens,
      fillableOrder.interestTokenAddress
    );
    const collateralTokenSymbol = getSymbol(
      tokens,
      fillableOrder.collateralTokenAddress
    );

    const loanTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      fillableOrder.loanTokenAddress
    }`;
    const interestTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      fillableOrder.interestTokenAddress
    }`;
    const collateralTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      fillableOrder.collateralTokenAddress
    }`;

    const oracleAddressLink = `${this.props.bZx.etherscanURL}address/${
      fillableOrder.oracleAddress
    }`;
    const feeRecipientAddressLink = `${this.props.bZx.etherscanURL}address/${
      fillableOrder.feeRecipientAddress
    }`;

    const isUsingRelay =
      fillableOrder.feeRecipientAddress !==
      `0x0000000000000000000000000000000000000000`;

    return (
      <Card style={noShadow === true ? { boxShadow: `unset` } : {}}>
        <CardContent>
          <DataPointContainer>
            <Label>Order #</Label>
            <DataPoint>
              <Hash>{fillableOrder.loanOrderHash}</Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Fillable?</Label>
            <DataPoint>
              {isMaker ? `No - You made this order` : `Yes`}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Loan Amount</Label>
            <DataPoint>
              {fromBigNumber(fillableOrder.loanTokenAmount, 1e18)}
              {` `}
              {loanTokenSymbol}
              {` `}(
              <AddressLink href={loanTokenAddressLink}>
                {fillableOrder.loanTokenAddress}
              </AddressLink>)
            </DataPoint>
          </DataPointContainer>

          <IndentedContainer>
            <DataPointContainer>
              <Label>First Fill</Label>
              <DataPoint>
                {!fillableOrder.addedUnixTimestampSec
                  ? `No fills`
                  : `${addedDateStr} (${addedDate.fromNow()})`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Fill Count</Label>
              <DataPoint>{fillsStr}</DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Filled</Label>
              <DataPoint>
                {fromBigNumber(fillableOrder.orderFilledAmount, 1e18)}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Cancelled</Label>
              <DataPoint>
                {fromBigNumber(fillableOrder.orderCancelledAmount, 1e18)}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Remaining</Label>
              <DataPoint>
                {fromBigNumber(
                  fillableOrder.loanTokenAmount -
                    fillableOrder.orderFilledAmount -
                    fillableOrder.orderCancelledAmount,
                  1e18
                )}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>
          </IndentedContainer>

          <DataPointContainer>
            <Label>Interest Amount</Label>
            <DataPoint>
              {fromBigNumber(fillableOrder.interestAmount, 1e18)}
              {` `}
              {interestTokenSymbol}
              {` `}
              per day
              {` `}(
              <AddressLink href={interestTokenAddressLink}>
                {fillableOrder.interestTokenAddress}
              </AddressLink>)
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Collateral Token</Label>
            {collateralTokenSymbol !== `unknown` ? (
              <DataPoint>
                {collateralTokenSymbol}
                {` `}(
                <AddressLink href={collateralTokenAddressLink}>
                  {fillableOrder.collateralTokenAddress}
                </AddressLink>)
              </DataPoint>
            ) : (
              <DataPoint>(not set by maker)</DataPoint>
            )}
          </DataPointContainer>

          <DataPointContainer>
            <Label>Initial Margin</Label>
            <DataPoint>{fillableOrder.initialMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Maintenance Margin</Label>
            <DataPoint>{fillableOrder.maintenanceMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Oracle Address</Label>
            <DataPoint>
              <Hash>
                <AddressLink href={oracleAddressLink}>
                  {fillableOrder.oracleAddress}
                </AddressLink>
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Expires</Label>
            <DataPoint>{`${dateStr} (${date.fromNow()})`}</DataPoint>
          </DataPointContainer>

          {isUsingRelay && (
            <Fragment>
              <DataPointContainer>
                <Label>Fee recipient address</Label>
                <DataPoint>
                  <Hash>
                    <AddressLink href={feeRecipientAddressLink}>
                      {fillableOrder.feeRecipientAddress}
                    </AddressLink>
                  </Hash>
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(fillableOrder.lenderRelayFee, 1e18)} BZRX
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(fillableOrder.traderRelayFee, 1e18)} BZRX
                </DataPoint>
              </DataPointContainer>
            </Fragment>
          )}

          <div>
            <br />
            <a href="#" onClick={this.toggleShowRawOrder}>
              {showRawOrder ? `Hide` : `Show`} raw order
            </a>
          </div>
          {showRawOrder && <Pre>{JSON.stringify(fillableOrder, null, 4)}</Pre>}

          <div>
            <br />
            <MuiButton
              size="small"
              onClick={() => changeTab(`Orders_FillOrder`, fillableOrder)}
              variant="raised"
              color="primary"
              // disabled={isMaker}
            >
              {!isMaker ? `Fill Order` : `Cancel Order`}
            </MuiButton>
          </div>
        </CardContent>
      </Card>
    );
  }
}
