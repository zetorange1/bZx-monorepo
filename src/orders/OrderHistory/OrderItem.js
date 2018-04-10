import { Fragment } from "react";
import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import moment from "moment";
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
    // const { b0x, accounts } = this.props;
    // const loanPositions = await b0x.getLoanPositions({
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
    const { order, accounts, tokens } = this.props;
    const { showRawOrder } = this.state;
    // const { loanPositions } = this.state;
    const isMaker = order.maker === accounts[0].toLowerCase();
    const date = moment(order.expirationUnixTimestampSec * 1000);
    const dateStr = date.format(`MMMM Do YYYY, h:mm a`);

    const loanTokenSymbol = getSymbol(tokens, order.loanTokenAddress);
    const interestTokenSymbol = getSymbol(tokens, order.interestTokenAddress);
    const collateralTokenSymbol = getSymbol(
      tokens,
      order.collateralTokenAddress
    );

    const tokenLinkPrefix = `https://ropsten.etherscan.io/token/`;
    const loanTokenAddressLink = `${tokenLinkPrefix}${order.loanTokenAddress}`;
    const interestTokenAddressLink = `${tokenLinkPrefix}${
      order.interestTokenAddress
    }`;
    const collateralTokenAddressLink = `${tokenLinkPrefix}${
      order.collateralTokenAddress
    }`;

    const addressLinkPrefix = `https://ropsten.etherscan.io/address/`;
    const oracleAddressLink = `${addressLinkPrefix}${order.oracleAddress}`;
    const feeRecipientAddressLink = `${addressLinkPrefix}${
      order.feeRecipientAddress
    }`;

    const isUsingRelay =
      order.feeRecipientAddress !==
      `0x0000000000000000000000000000000000000000`;

    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order #</Label>
            <DataPoint>
              <Hash>{order.loanOrderHash}</Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Your Role</Label>
            <DataPoint>{isMaker ? `Maker` : `Taker`}</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Loan Amount</Label>
            <DataPoint>
              {fromBigNumber(order.loanTokenAmount, 1e18)} {loanTokenSymbol}
              {` `}(
              <AddressLink href={loanTokenAddressLink}>
                {order.loanTokenAddress}
              </AddressLink>)
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest Amount</Label>
            <DataPoint>
              {fromBigNumber(order.interestAmount, 1e18)} {interestTokenSymbol}
              {` `}
              per day
              {` `}(
              <AddressLink href={interestTokenAddressLink}>
                {order.interestTokenAddress}
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
                  {order.collateralTokenAddress}
                </AddressLink>)
              </DataPoint>
            ) : (
              <DataPoint>(not set by maker)</DataPoint>
            )}
          </DataPointContainer>

          <DataPointContainer>
            <Label>Initial Margin</Label>
            <DataPoint>{order.initialMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Maintenance Margin</Label>
            <DataPoint>{order.maintenanceMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Oracle Address</Label>
            <DataPoint>
              <Hash>
                <AddressLink href={oracleAddressLink}>
                  {order.oracleAddress}
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
                      {order.feeRecipientAddress}
                    </AddressLink>
                  </Hash>
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(order.lenderRelayFee, 1e18)} B0X
                </DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Trader Relay Fee</Label>
                <DataPoint>
                  {fromBigNumber(order.traderRelayFee, 1e18)} B0X
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
          {showRawOrder && <Pre>{JSON.stringify(order, null, 4)}</Pre>}
          {/* <Pre>{JSON.stringify(loanPositions, null, 4)}</Pre> */}
        </CardContent>
      </Card>
    );
  }
}
