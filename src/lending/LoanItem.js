import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";

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

const WithdrawLink = styled.a`
  cursor: pointer;
  text-decoration: underline;
  margin-left: 12px;
`;

export default class LoanItem extends React.Component {
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  withdrawInterest = () => {
    // do stuff to initiate interest withdrawal here
    alert(`withdraw interest`);
  };

  render() {
    const collateralTokenAmountFilled = 6.25;
    const collateralTokenSymbol = `SYM`;
    const loanTokenAmountFilled = 12;
    const loanTokenSymbol = `SYM`;
    const interestPaidSoFar = 0.0002;
    const interestTokenSymbol = `SYM`;
    const filledUnixTimestampSec = 1519283349;
    const closedUnixTimestampSec = 1519283349;

    const loanClosedDate = new Date(closedUnixTimestampSec * 1000);
    const loanOpenedDate = new Date(filledUnixTimestampSec * 1000);
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
            <Label>Borrower </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                0x0000000000000000000000000000000000000000
              </Hash>
            </DataPoint>
          </DataPointContainer>

          {this.props.closed ? (
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
          )}

          <hr />

          <DataPointContainer>
            <Label>Collateral</Label>
            <DataPoint>
              {collateralTokenAmountFilled} {collateralTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {loanTokenAmountFilled} {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <br />

          <DataPointContainer>
            <Label>Total Interest Paid</Label>
            <DataPoint>
              {interestPaidSoFar} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest held in b0x</Label>
            <DataPoint>
              {interestPaidSoFar} {interestTokenSymbol}
            </DataPoint>
            <WithdrawLink href="#" onClick={this.withdrawInterest}>
              withdraw
            </WithdrawLink>
          </DataPointContainer>

          {this.props.closed && <br />}

          {this.props.closed && (
            <DataPointContainer>
              <Label>Loan Opened</Label>
              <DataPoint title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </DataPoint>
            </DataPointContainer>
          )}
        </CardContent>
      </Card>
    );
  }
}
