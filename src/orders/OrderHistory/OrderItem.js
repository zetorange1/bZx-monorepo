import { Fragment } from "react";
import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import moment from "moment";
import { BigNumber } from "bignumber.js";
import { COLORS } from "../../styles/constants";
import { fromBigNumber } from "../../common/utils";
import { getSymbol, getDecimals } from "../../common/tokens";

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
    const { takenOrder, accounts, tokens, noShadow } = this.props;
    const { showRawOrder } = this.state;
    // const { loanPositions } = this.state;

    const isMaker = takenOrder.maker === accounts[0].toLowerCase();
    const isLender = takenOrder.lender === accounts[0].toLowerCase();
    const date = moment(takenOrder.expirationUnixTimestampSec * 1000).utc();
    const dateStr = date.format(`MMMM Do YYYY, h:mm a UTC`);
    const addedDate = moment(takenOrder.addedUnixTimestampSec * 1000).utc();
    const addedDateStr = addedDate.format(`MMMM Do YYYY, h:mm a UTC`);

    takenOrder.loanTokenAmount = BigNumber(takenOrder.loanTokenAmount).toFixed(
      0
    );
    takenOrder.orderFilledAmount = BigNumber(
      takenOrder.orderFilledAmount
    ).toFixed(0);
    takenOrder.orderCancelledAmount = BigNumber(
      takenOrder.orderCancelledAmount
    ).toFixed(0);
    takenOrder.interestAmount = BigNumber(takenOrder.interestAmount).toFixed(0);
    takenOrder.lenderRelayFee = BigNumber(takenOrder.lenderRelayFee).toFixed(0);
    takenOrder.traderRelayFee = BigNumber(takenOrder.traderRelayFee).toFixed(0);

    const fillsStr =
      takenOrder.orderTraderCount +
      (takenOrder.orderTraderCount === 1 ? ` trader` : ` traders`);

    const loanTokenSymbol = getSymbol(tokens, takenOrder.loanTokenAddress);
    const interestTokenSymbol = getSymbol(
      tokens,
      takenOrder.interestTokenAddress
    );
    const collateralTokenSymbol = getSymbol(
      tokens,
      takenOrder.collateralTokenAddress
    );

    const loanTokenDecimals = getDecimals(tokens, takenOrder.loanTokenAddress);
    const interestTokenDecimals = getDecimals(
      tokens,
      takenOrder.interestTokenAddress
    );

    const loanTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      takenOrder.loanTokenAddress
    }`;
    const interestTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      takenOrder.interestTokenAddress
    }`;
    const collateralTokenAddressLink = `${this.props.bZx.etherscanURL}token/${
      takenOrder.collateralTokenAddress
    }`;

    const oracleAddressLink = `${this.props.bZx.etherscanURL}address/${
      takenOrder.oracleAddress
    }`;
    const feeRecipientAddressLink = `${this.props.bZx.etherscanURL}address/${
      takenOrder.feeRecipientAddress
    }`;

    const isUsingRelay =
      takenOrder.feeRecipientAddress !==
      `0x0000000000000000000000000000000000000000`;

    return (
      <Card style={noShadow === true ? { boxShadow: `unset` } : {}}>
        <CardContent>
          <DataPointContainer>
            <Label>Order #</Label>
            <DataPoint>
              <Hash>{takenOrder.loanOrderHash}</Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Your Role</Label>
            <DataPoint>
              {isMaker ? `Maker` : `Taker`} / {isLender ? `Lender` : `Trader`}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Loan Amount</Label>
            <DataPoint>
              {fromBigNumber(
                takenOrder.loanTokenAmount,
                10 ** loanTokenDecimals
              )}
              {` `}
              {loanTokenSymbol}
              {` `}(
              <AddressLink href={loanTokenAddressLink}>
                {takenOrder.loanTokenAddress}
              </AddressLink>)
            </DataPoint>
          </DataPointContainer>

          <IndentedContainer>
            <DataPointContainer>
              <Label>First Fill</Label>
              <DataPoint>
                {`${addedDateStr} (${addedDate.fromNow()})`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Fill Count</Label>
              <DataPoint>{fillsStr}</DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Filled</Label>
              <DataPoint>
                {fromBigNumber(
                  takenOrder.orderFilledAmount,
                  10 ** loanTokenDecimals
                )}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Cancelled</Label>
              <DataPoint>
                {fromBigNumber(
                  takenOrder.orderCancelledAmount,
                  10 ** loanTokenDecimals
                )}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Total Remaining</Label>
              <DataPoint>
                {fromBigNumber(
                  takenOrder.loanTokenAmount -
                    takenOrder.orderFilledAmount -
                    takenOrder.orderCancelledAmount,
                  10 ** loanTokenDecimals
                )}
                {` `}
                {loanTokenSymbol}
              </DataPoint>
            </DataPointContainer>
          </IndentedContainer>

          <DataPointContainer>
            <Label>Interest Amount</Label>
            <DataPoint>
              {fromBigNumber(
                takenOrder.interestAmount,
                10 ** interestTokenDecimals
              )}
              {` `}
              {interestTokenSymbol}
              {` `}
              per day
              {` `}(
              <AddressLink href={interestTokenAddressLink}>
                {takenOrder.interestTokenAddress}
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
                  {takenOrder.collateralTokenAddress}
                </AddressLink>)
              </DataPoint>
            ) : (
              <DataPoint>(not set by maker)</DataPoint>
            )}
          </DataPointContainer>

          <DataPointContainer>
            <Label>Initial Margin</Label>
            <DataPoint>{takenOrder.initialMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Maintenance Margin</Label>
            <DataPoint>{takenOrder.maintenanceMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Oracle Address</Label>
            <DataPoint>
              <Hash>
                <AddressLink href={oracleAddressLink}>
                  {takenOrder.oracleAddress}
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
                      {takenOrder.feeRecipientAddress}
                    </AddressLink>
                  </Hash>
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(takenOrder.lenderRelayFee, 1e18)} BZRX
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(takenOrder.traderRelayFee, 1e18)} BZRX
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
          {showRawOrder && <Pre>{JSON.stringify(takenOrder, null, 4)}</Pre>}
          {/* <Pre>{JSON.stringify(loanPositions, null, 4)}</Pre> */}
        </CardContent>
      </Card>
    );
  }
}
