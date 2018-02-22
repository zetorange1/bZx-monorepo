import styled from "styled-components";
import MuiCard, {
  CardActions,
  CardContent as MuiCardContent
} from "material-ui/Card";
import Button from "material-ui/Button";
import Icon from "material-ui/Icon";
import IconButton from "material-ui/IconButton";
import Collapse from "material-ui/transitions/Collapse";

import { COLORS } from "../styles/constants";

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
  text-overflow: ellipsis;
  max-width: 20ch;
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

const Textarea = styled.textarea`
  width: 100%;
  height: 120px;
  margin-bottom: 16px;
`;

export default class OpenLoan extends React.Component {
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  render() {
    const collateralTokenAmountFilled = 6.25;
    const collateralTokenSymbol = `SYM`;
    const loanTokenAmountFilled = 12;
    const loanTokenSymbol = `SYM`;
    const interestPaidSoFar = 0.0002;
    const interestTokenSymbol = `SYM`;
    const filledUnixTimestampSec = 1519283349;

    const { zeroExTradeOpened } = this.props;
    const tradeTokenAmountFilled = 123;
    const tradeTokenSymbol = `SYM`;

    const loanOpenedDate = new Date(filledUnixTimestampSec * 1000);
    if (this.props.hideDetails) {
      return (
        <Card>
          <CardContent>
            <DataPointContainer>
              <Label>Order # </Label>
              <DataPoint>
                <Hash href="#" target="_blank" rel="noopener noreferrer">
                  0x0000000000000000000000000000000000000000
                </Hash>
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Lender </Label>
              <DataPoint>
                <Hash href="#" target="_blank" rel="noopener noreferrer">
                  0x0000000000000000000000000000000000000000
                </Hash>
              </DataPoint>
            </DataPointContainer>

            <UpperRight>
              <Label>Loan Opened</Label>
              <div title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </div>
            </UpperRight>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                0x0000000000000000000000000000000000000000
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Lender </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                0x0000000000000000000000000000000000000000
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
            <Label>Amount Staked as Collateral</Label>
            <DataPoint>
              {collateralTokenAmountFilled} {collateralTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Amount Borrowed</Label>
            <DataPoint>
              {loanTokenAmountFilled} {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest Paid</Label>
            <DataPoint>
              {interestPaidSoFar} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>
        </CardContent>

        <CardActions>
          <DataPointContainer style={{ marginLeft: `12px` }}>
            <Label>0x trade opened</Label>
            <DataPoint>{Boolean(zeroExTradeOpened).toString()}</DataPoint>
          </DataPointContainer>
          {zeroExTradeOpened && (
            <DataPointContainer style={{ marginLeft: `12px` }}>
              <Label>Trade Amount</Label>
              <DataPoint>
                {tradeTokenAmountFilled} {tradeTokenSymbol}
              </DataPoint>
            </DataPointContainer>
          )}
          <Button
            style={{ marginLeft: `auto` }}
            onClick={this.handleExpandClick}
          >
            Manage 0x trade
          </Button>
          <IconButton onClick={this.handleExpandClick}>
            <Icon>
              {this.state.expanded
                ? `keyboard_arrow_up`
                : `keyboard_arrow_down`}
            </Icon>
          </IconButton>
        </CardActions>
        <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
          {zeroExTradeOpened ? (
            <CardContent>
              <Button variant="raised" color="primary">
                Close trade with Kyber market order
              </Button>
              <p>Or, you may paste in a 0x order object:</p>
              <Textarea />
              <Button variant="raised">Close with 0x counter-trade</Button>
            </CardContent>
          ) : (
            <CardContent>
              <p>Paste in a 0x order here to open a trade with loaned funds:</p>
              <Textarea />
              <Button variant="raised" color="primary">
                Open a 0x trade
              </Button>
            </CardContent>
          )}
        </Collapse>
      </Card>
    );
  }
}

// - if a 0x trade is not open from funds from the loan, provide something like this: https://0xproject.com/portal/fill
//   - a trader finds 0x trades from any source, and drops the 0x Order JSON here (note this is a 0x JSON from 0xProject and not to be confused with "LEND ORDER JSON" for b0x)
//   - the b0x portal reads the 0x JSON and submits the params to the b0x contract "open0xTrade" sol function:
//     function open0xTrade(
//       bytes32 lendOrderHash,
//       address[5] orderAddresses0x,
//       uint[6] orderValues0x,
//       uint8 v,
//       bytes32 r,
//       bytes32 s)
//       public
//       returns (uint);

// - if an 0x trade has been opened using funds from the loan, show a few details about the loan:
//   - token that was traded and bought using the lend token (tradeTokenAddress)
//   - trade token amount (tradeTokenAmountFilled)
//   - should have "Close Trade" button - this calls into b0x to trigger a market order with Kyber to close this trade and buy back the lend token
//     sol function:
//       function closeTrade(
//         bytes32 lendOrderHash)
//         public
//         returns (bool tradeSuccess);

//   - optionally, we can provide a form like this https://0xproject.com/portal/fill again, to let the trader close the order with an "opposite" 0x order. this
//     passes the 0x order json params to b0x similar to above.
//     sol function:
//       function closeWith0xTrade(
//         bytes32 lendOrderHash,
//         address[5] orderAddresses0x,
//         uint[6] orderValues0x,
//         uint8 v,
//         bytes32 r,
//         bytes32 s)
//         public
//         returns (uint);

// - provide a way to traders to change the current "marginToken of an active loan (via b0x contract function call TBD).
// - provide a way to traders to "deposit" additional margin token to increase their margin level on active loans (via b0x contract function call TBD).
// - provide a way for traders to withdraw margin token if and only if it's above "initialMarginAmount" (via b0x contract function call TBD).
