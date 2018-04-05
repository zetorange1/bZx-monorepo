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

export default class OrderItem extends React.Component {
  // state = { loanPositions: [] };
  state = { showRawOrder: true };

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
            <Label>Expires</Label>
            <DataPoint>{`${dateStr} (${date.fromNow()})`}</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Role</Label>
            <DataPoint>{isMaker ? `Maker` : `Lender`}</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Loan Amount</Label>
            <DataPoint>
              {fromBigNumber(order.loanTokenAmount, 1e18)} {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest Amount</Label>
            <DataPoint>
              {fromBigNumber(order.interestAmount, 1e18)} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Initial Margin</Label>
            <DataPoint>{order.initialMarginAmount}%</DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Maintenance Margin</Label>
            <DataPoint>{order.maintenanceMarginAmount}%</DataPoint>
          </DataPointContainer>
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
