import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import Button from "material-ui/Button";

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

const LowerUpperRight = styled.div`
  position: absolute;
  top: 108px;
  right: 16px;
`;

export default class LoanItem extends React.Component {
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  liquidate = () => {
    // do stuff to initiate liquidation
    alert(`liquidate loan`);
  };

  render() {
    const collateralTokenAmountFilled = 6.25;
    const collateralTokenSymbol = `SYM`;
    const loanTokenAmountFilled = 12;
    const loanTokenSymbol = `SYM`;
    const filledUnixTimestampSec = 1519283349;
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

          <DataPointContainer>
            <Label>Borrower </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                0x0000000000000000000000000000000000000000
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Liquidation Level </Label>
            <DataPoint>120%</DataPoint>
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
              {collateralTokenAmountFilled} {collateralTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {loanTokenAmountFilled} {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <LowerUpperRight>
            <Button variant="raised" onClick={this.liquidate}>
              Liquidate
            </Button>
          </LowerUpperRight>
        </CardContent>
      </Card>
    );
  }
}
