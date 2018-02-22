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
            <Label>Lender </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                0x0000000000000000000000000000000000000000
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <UpperRight>
            <Label>Loan Closed</Label>
            <div title={loanClosedDate.toUTCString()}>
              {loanClosedDate.toLocaleString()}
            </div>
          </UpperRight>

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

          <DataPointContainer>
            <Label>Interest Paid</Label>
            <DataPoint>
              {interestPaidSoFar} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Loan Opened</Label>
            <DataPoint title={loanOpenedDate.toUTCString()}>
              {loanOpenedDate.toLocaleString()}
            </DataPoint>
          </DataPointContainer>
        </CardContent>
      </Card>
    );
  }
}
